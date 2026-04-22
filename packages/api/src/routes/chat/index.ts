import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { ChatService } from '@/services/chat-service';
import { MessageType, type Prisma } from '@prisma/client';
import { resolveChatPair } from '@/lib/can-chat';

type ChatRoomRow = Prisma.ChatRoomGetPayload<{
  include: {
    worker: true;
    employer: true;
    order: { select: { id: true; date: true } };
    messages: true;
    _count: { select: { messages: true } };
  };
}>;

function toMessageApi(
  m: { id: string; type: MessageType; text: string | null; createdAt: Date; isSystem: boolean; senderId: string },
) {
  return {
    id: m.id,
    type: m.type,
    text: m.text,
    createdAt: m.createdAt.toISOString(),
    isSystem: m.isSystem,
    senderId: m.senderId,
  };
}

function mapRoomListItem(
  userId: string,
  r: ChatRoomRow,
  unreadCount: number,
): {
  id: string;
  createdAt: string;
  peer: { displayName: string; role: 'worker' | 'employer'; avatarUrl: string | null };
  lastMessage: ReturnType<typeof toMessageApi> | null;
  unreadCount: number;
} {
  const isThisWorker = r.worker.userId === userId;
  const peer = isThisWorker
    ? {
        role: 'employer' as const,
        displayName: (r.employer.companyName?.trim() || 'Работодатель').slice(0, 200),
        avatarUrl: r.employer.logoUrl,
      }
    : {
        role: 'worker' as const,
        displayName: `${r.worker.firstName} ${r.worker.lastName}`.trim() || 'Исполнитель',
        avatarUrl: r.worker.photoUrl,
      };
  const last = r.messages[0] ?? null;
  return {
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    peer,
    lastMessage: last ? toMessageApi(last) : null,
    unreadCount,
  };
}

export const chatRoutes: FastifyPluginAsync = async (fastify) => {
  const pre = [fastify.authenticate, fastify.requireRole(['worker', 'employer'])];

  // GET /unread
  fastify.get('/unread', { preHandler: pre }, async (request) => {
    const userId = request.jwtUser.sub;
    const svc = new ChatService(fastify.prisma);
    const total = await svc.getTotalUnreadForUser(userId);
    return { data: { total } };
  });

  // GET /rooms/:id — метаданные (собеседник) для шапки
  fastify.get('/rooms/:id', { preHandler: pre }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.jwtUser.sub;
    const svc = new ChatService(fastify.prisma);
    const allowed = await svc.isRoomParticipant(id, userId);
    if (!allowed) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Чат не найден' } });
    }
    const r = await fastify.prisma.chatRoom.findUniqueOrThrow({
      where: { id },
      include: {
        worker: true,
        employer: true,
        order: { select: { id: true, date: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: {
          select: {
            messages: {
              where: { isRead: false, isSystem: false, NOT: { senderId: userId } },
            },
          },
        },
      },
    });
    return {
      data: {
        room: mapRoomListItem(
          userId,
          r as unknown as ChatRoomRow,
          r._count.messages,
        ),
      },
    };
  });

  // GET /rooms
  fastify.get('/rooms', { preHandler: pre }, async (request) => {
    const userId = request.jwtUser.sub;
    const svc = new ChatService(fastify.prisma);
    const rooms = await svc.getRoomsForUser(userId);
    const out = rooms.map((r) =>
      mapRoomListItem(
        userId,
        r as unknown as ChatRoomRow,
        r._count.messages,
      ),
    );
    return { data: { rooms: out } };
  });

  // POST /rooms
  fastify.post('/rooms', { preHandler: pre }, async (request, reply) => {
    const body = z.object({ recipientId: z.string() }).parse(request.body);
    const userId = request.jwtUser.sub;
    const pair = await resolveChatPair(fastify.prisma, userId, body.recipientId);
    if (!pair) {
      return reply.status(403).send({
        error: { code: 'CHAT_NOT_ALLOWED', message: 'Чат с этим пользователем недоступен' },
      });
    }
    const svc = new ChatService(fastify.prisma);
    let room;
    let created: boolean;
    try {
      const res = await svc.getOrCreateRoom(pair);
      room = res.room;
      created = res.created;
    } catch (e) {
      if (e instanceof Error && e.message === 'CHAT_NOT_ALLOWED') {
        return reply
          .status(403)
          .send({ error: { code: 'CHAT_NOT_ALLOWED', message: 'Связь не найдена' } });
      }
      throw e;
    }
    const nsp = (fastify as { chatNsp?: import('socket.io').Namespace }).chatNsp;
    if (created && nsp) {
      const wUid = room.worker.userId;
      const eUid = room.employer.userId;
      const firstMsg = await fastify.prisma.chatMessage.findFirst({
        where: { roomId: room.id },
        orderBy: { createdAt: 'asc' },
      });
      for (const uid of [wUid, eUid]) {
        nsp.to(`user:${uid}`).emit('room:created', { roomId: room.id });
        if (firstMsg) {
          nsp.to(`user:${uid}`).emit('message:new', {
            roomId: room.id,
            message: {
              id: firstMsg.id,
              roomId: firstMsg.roomId,
              senderId: firstMsg.senderId,
              type: firstMsg.type,
              text: firstMsg.text,
              isRead: firstMsg.isRead,
              readAt: firstMsg.readAt?.toISOString() ?? null,
              isSystem: firstMsg.isSystem,
              createdAt: firstMsg.createdAt.toISOString(),
            },
          });
        }
      }
    }
    return reply.status(created ? 201 : 200).send({
      data: {
        room: {
          id: room.id,
          workerId: room.workerId,
          employerId: room.employerId,
          orderId: room.orderId,
        },
        created,
      },
    });
  });

  // GET /rooms/:id/messages
  fastify.get('/rooms/:id/messages', { preHandler: pre }, async (request, reply) => {
    const { id: roomId } = request.params as { id: string };
    const q = z
      .object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(50) })
      .parse(request.query);
    const userId = request.jwtUser.sub;
    const svc = new ChatService(fastify.prisma);
    try {
      const { data, meta } = await svc.getMessages(roomId, userId, q.page, q.limit);
      return {
        data: {
          messages: data.map((m) => ({
            id: m.id,
            type: m.type,
            text: m.text,
            isRead: m.isRead,
            readAt: m.readAt?.toISOString() ?? null,
            isSystem: m.isSystem,
            senderId: m.senderId,
            createdAt: m.createdAt.toISOString(),
          })),
        },
        meta,
      };
    } catch (e) {
      if (e instanceof Error && e.message === 'FORBIDDEN') {
        return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Нет доступа' } });
      }
      throw e;
    }
  });
};
