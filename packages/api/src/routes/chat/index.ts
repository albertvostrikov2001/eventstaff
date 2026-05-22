import type { FastifyPluginAsync } from 'fastify';
import type { Namespace } from 'socket.io';
import { ChatService } from '@/services/chat-service';
import {
  ChatRoomContextType,
  type ChatMessage,
  type MessageType,
  UserStatus,
  type Prisma,
} from '@prisma/client';
import { canChat, resolveChatPair } from '@/lib/can-chat';
import {
  InvalidChatContextError,
  normalizeAndValidateOpenContext,
  suggestOpenContextForPair,
  type OpenChatContextPayload,
} from '@/lib/chat-open-context';
import { computeRoomContextLine } from '@/lib/chat-context-subtitle';
import { serializeChatMessage } from '@/lib/chat-message-dto';
import { replyFail, replyOk, replyPaginated } from '@/lib/api-reply';
import { z } from 'zod';

type ChatRoomRow = Prisma.ChatRoomGetPayload<{
  include: {
    worker: true;
    employer: true;
    order: { select: { id: true; date: true } };
    messages: true;
    _count: { select: { messages: true } };
  };
}>;

type ChatRoomRowDetail = ChatRoomRow & {
  worker: ChatRoomRow['worker'] & { user: { id: string; status: UserStatus } };
  employer: ChatRoomRow['employer'] & { user: { id: string; status: UserStatus } };
};

type OpenChatSuggested =
  | { type: 'GENERAL' }
  | { type: 'APPLICATION' | 'INVITATION' | 'SHIFT' | 'VACANCY'; id: string };

function prismaContextToSuggested(n: {
  contextType: ChatRoomContextType;
  contextId: string | null;
}): OpenChatSuggested | null {
  if (!n.contextId && n.contextType === ChatRoomContextType.GENERAL) {
    return { type: 'GENERAL' };
  }
  if (!n.contextId) return null;
  switch (n.contextType) {
    case ChatRoomContextType.APPLICATION:
      return { type: 'APPLICATION', id: n.contextId };
    case ChatRoomContextType.INVITATION:
      return { type: 'INVITATION', id: n.contextId };
    case ChatRoomContextType.SHIFT:
      return { type: 'SHIFT', id: n.contextId };
    case ChatRoomContextType.VACANCY:
      return { type: 'VACANCY', id: n.contextId };
    default:
      return { type: 'GENERAL' };
  }
}

type FastifyChat = { chatNsp?: Namespace };

function getNsp(app: FastifyChat): Namespace | undefined {
  return app.chatNsp;
}

async function bumpUnreadTotals(
  nsp: Namespace | undefined,
  prisma: import('@prisma/client').PrismaClient,
  ...userIds: string[]
): Promise<void> {
  if (!nsp || userIds.length === 0) return;
  const svc = new ChatService(prisma);
  const seen = new Set<string>();
  for (const uid of userIds) {
    if (!uid || seen.has(uid)) continue;
    seen.add(uid);
    const total = await svc.getTotalUnreadForUser(uid);
    nsp.to(`user:${uid}`).emit('unread:update', { total });
  }
}

/** Last message snippet in list APIs */
function lastMessageBrief(m: {
  id: string;
  type: MessageType;
  text: string | null;
  createdAt: Date;
  isSystem: boolean;
  senderId: string;
}) {
  return {
    id: m.id,
    type: m.type,
    text: m.text,
    createdAt: m.createdAt.toISOString(),
    isSystem: m.isSystem,
    senderId: m.senderId,
  };
}

export const chatRoutes: FastifyPluginAsync = async (fastify) => {
  const pre = [fastify.authenticate, fastify.requireRole(['worker', 'employer'])];

  async function notifyRoomBootstrap(roomId: string, roomWorkerUserId: string, roomEmployerUserId: string) {
    const nsp = getNsp(fastify as FastifyChat);
    if (!nsp) return;
    const firstMsg = await fastify.prisma.chatMessage.findFirst({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
    });
    for (const uid of [roomWorkerUserId, roomEmployerUserId]) {
      nsp.to(`user:${uid}`).emit('room:created', { roomId });
      if (firstMsg) {
        nsp.to(`user:${uid}`).emit('message:new', {
          roomId,
          message: serializeChatMessage(firstMsg),
        });
      }
    }
  }

  /** Shared payload for POST /rooms and POST /rooms/open after room + created flag resolved */
  function roomOpenResponse(room: {
    id: string;
    workerId: string;
    employerId: string;
    orderId: string | null;
    contextType: string;
    contextId: string | null;
  }) {
    return {
      id: room.id,
      workerId: room.workerId,
      employerId: room.employerId,
      orderId: room.orderId,
      contextType: room.contextType,
      contextId: room.contextId,
    };
  }

  async function enrichRoomPayload(
    userId: string,
    r: ChatRoomRow,
    unreadCount: number,
    prisma = fastify.prisma,
  ) {
    const base = enrichRoomPayloadSync(userId, r, unreadCount);
    const line = await computeRoomContextLine(prisma, r);
    return {
      ...base,
      contextType: r.contextType,
      contextId: r.contextId,
      contextSubtitle: line.subtitle,
      vacancyId: line.vacancyId ?? null,
      vacancyTitle: line.vacancyTitle ?? null,
      vacancyUnavailable: line.vacancyUnavailable,
    };
  }

  function enrichRoomPayloadSync(userId: string, r: ChatRoomRow, unreadCount: number) {
    const isThisWorker = r.worker.userId === userId;
    const peer = isThisWorker
      ? ({
          role: 'employer' as const,
          displayName: (r.employer.companyName?.trim() || 'Работодатель').slice(0, 200),
          avatarUrl: r.employer.logoUrl,
        } satisfies {
          role: 'employer';
          displayName: string;
          avatarUrl: string | null;
        })
      : ({
          role: 'worker' as const,
          displayName: `${r.worker.firstName} ${r.worker.lastName}`.trim() || 'Исполнитель',
          avatarUrl: r.worker.photoUrl,
          verified: r.worker.isVerified,
        });
    const last = r.messages[0] ?? null;
    return {
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      lastMessageAt: r.lastMessageAt.toISOString(),
      peer,
      lastMessage: last ? lastMessageBrief(last) : null,
      unreadCount,
    };
  }

  async function enrichRoomPayloadWithUser(userId: string, r: ChatRoomRowDetail) {
    const unread = r._count.messages;
    const enriched = enrichRoomPayloadSync(userId, r as ChatRoomRow, unread);

    let peerInactive = false;
    const counterpartUser =
      enriched.peer.role === 'worker' ? r.worker.user : r.employer.user;
    if (counterpartUser.status !== UserStatus.active) {
      peerInactive = true;
    }

    const line = await computeRoomContextLine(fastify.prisma, r);

    let vacancyHref: string | null = null;
    if (
      line.vacancyId &&
      !line.vacancyUnavailable &&
      enriched.peer.role === 'worker'
    ) {
      vacancyHref = `/employer/vacancies/${line.vacancyId}`;
    }

    return {
      ...enriched,
      contextType: r.contextType,
      contextId: r.contextId,
      contextSubtitle: line.subtitle,
      vacancyId: line.vacancyId ?? null,
      vacancyTitle: line.vacancyTitle ?? null,
      vacancyUnavailable: line.vacancyUnavailable,
      vacancyHref,
      peerInactive,
      workerProfileId: enriched.peer.role === 'worker' ? r.worker.id : null,
    };
  }

  // GET /unread
  fastify.get('/unread', { preHandler: pre }, async (request, reply) => {
    const userId = request.jwtUser.sub;
    const svc = new ChatService(fastify.prisma);
    const total = await svc.getTotalUnreadForUser(userId);
    return replyOk(reply, { total });
  });

  fastify.get('/can-chat', { preHandler: pre }, async (request, reply) => {
    const query = request.query as { recipientId?: string };
    const recipientId = typeof query.recipientId === 'string' ? query.recipientId.trim() : '';
    if (!recipientId) {
      return replyFail(reply, 400, 'BAD_REQUEST', 'recipientId');
    }
    const viewerId = request.jwtUser.sub;
    const allowed = await canChat(fastify.prisma, viewerId, recipientId);
    let suggested: OpenChatSuggested | null = null;
    const pair = await resolveChatPair(fastify.prisma, viewerId, recipientId);
    if (pair && allowed) {
      try {
        const n = await suggestOpenContextForPair(fastify.prisma, pair);
        suggested = prismaContextToSuggested(n);
      } catch {
        suggested = { type: 'GENERAL' };
      }
    }
    return replyOk(reply, { canChat: allowed, suggestedContext: suggested });
  });

  // GET /rooms/:id
  fastify.get('/rooms/:id', { preHandler: pre }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.jwtUser.sub;
    const svc = new ChatService(fastify.prisma);
    const allowed = await svc.isRoomParticipant(id, userId);
    if (!allowed) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Чат не найден');
    }
    const r = await fastify.prisma.chatRoom.findUniqueOrThrow({
      where: { id },
      include: {
        worker: { include: { user: { select: { status: true, id: true } } } },
        employer: { include: { user: { select: { status: true, id: true } } } },
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
    const enriched = await enrichRoomPayloadWithUser(userId, r as ChatRoomRowDetail);
    return replyOk(reply, { room: enriched });
  });

  // GET /rooms
  fastify.get('/rooms', { preHandler: pre }, async (request, reply) => {
    const userId = request.jwtUser.sub;
    const svc = new ChatService(fastify.prisma);
    const rooms = await svc.getRoomsForUser(userId);
    const out = await Promise.all(
      rooms.map(async (raw) =>
        enrichRoomPayload(userId, raw as unknown as ChatRoomRow, raw._count.messages),
      ),
    );
    const query = request.query as { search?: string };
    const q = typeof query.search === 'string' ? query.search.trim().toLowerCase() : '';
    let filtered = out;
    if (q) {
      filtered = out.filter((r) => r.peer.displayName.toLowerCase().includes(q));
    }
    return replyOk(reply, { rooms: filtered });
  });

  async function handleRoomOpen(body: OpenChatContextPayload | undefined | null, recipientId: string, userId: string) {
    const pair = await resolveChatPair(fastify.prisma, userId, recipientId);
    if (!pair) return { ok: false as const, error: 'CHAT_PAIR' as const };
    try {
      const normalized = await normalizeAndValidateOpenContext(fastify.prisma, pair, body ?? undefined);
      const svc = new ChatService(fastify.prisma);
      const { room, created } = await svc.openOrUpdateRoom(pair, normalized);
      return { ok: true as const, room, created };
    } catch (e) {
      if (e instanceof Error && e.message === 'CHAT_NOT_ALLOWED')
        return { ok: false as const, error: 'CHAT_NOT_ALLOWED' as const };
      if (e instanceof InvalidChatContextError)
        return { ok: false as const, error: 'BAD_CONTEXT' as const };
      throw e;
    }
  }

  // POST /rooms/open
  fastify.post('/rooms/open', { preHandler: pre }, async (request, reply) => {
    const openBodySchema = z.object({
      recipientId: z.string(),
      context: z
        .discriminatedUnion('type', [
          z.object({ type: z.literal('GENERAL') }),
          z.object({ type: z.literal('APPLICATION'), id: z.string() }),
          z.object({ type: z.literal('INVITATION'), id: z.string() }),
          z.object({ type: z.literal('SHIFT'), id: z.string() }),
          z.object({ type: z.literal('VACANCY'), id: z.string() }),
        ])
        .optional(),
    });

    const userId = request.jwtUser.sub;
    let bodyParsed: z.infer<typeof openBodySchema>;
    try {
      bodyParsed = openBodySchema.parse(request.body);
    } catch {
      return replyFail(reply, 400, 'BAD_REQUEST', 'Тело запроса');
    }

    const res = await handleRoomOpen(bodyParsed.context ?? undefined, bodyParsed.recipientId, userId);
    if (!res.ok) {
      if (res.error === 'CHAT_PAIR' || res.error === 'CHAT_NOT_ALLOWED') {
        return replyFail(reply, 403, 'CHAT_NOT_ALLOWED', 'Чат с этим пользователем недоступен');
      }
      return replyFail(reply, 400, 'BAD_CONTEXT', 'Указан неверный контекст диалога');
    }

    const { room, created } = res;

    const nsp = getNsp(fastify as FastifyChat);
    if (created && nsp) {
      await notifyRoomBootstrap(room.id, room.worker.userId, room.employer.userId);
    }
    const statusCode = created ? 201 : 200;
    return replyOk(
      reply,
      {
        room: roomOpenResponse(room),
        created,
      },
      statusCode,
    );
  });

  // POST /rooms (legacy — suggests context internally)
  fastify.post('/rooms', { preHandler: pre }, async (request, reply) => {
    const body = z.object({ recipientId: z.string() }).parse(request.body);
    const userId = request.jwtUser.sub;
    const res = await handleRoomOpen(undefined, body.recipientId, userId);

    if (!res.ok) {
      return replyFail(reply, 403, 'CHAT_NOT_ALLOWED', 'Чат с этим пользователем недоступен');
    }

    const { room, created } = res;

    if (created) {
      await notifyRoomBootstrap(room.id, room.worker.userId, room.employer.userId);
    }
    return replyOk(
      reply,
      {
        room: roomOpenResponse(room),
        created,
      },
      created ? 201 : 200,
    );
  });

  // POST /rooms/:id/messages
  fastify.post('/rooms/:id/messages', { preHandler: pre }, async (request, reply) => {
    const { id: roomId } = request.params as { id: string };
    const body = z
      .object({
        text: z.string().max(2000).nullish(),
        fileUrl: z.string().max(2000).nullish(),
        fileName: z.string().max(255).nullish(),
        replyToId: z.string().nullish(),
        replyToText: z.string().max(500).nullish(),
        replyToSenderName: z.string().max(100).nullish(),
      })
      .refine((d) => (d.text?.trim() ?? '') !== '' || (d.fileUrl?.trim() ?? '') !== '', {
        message: 'Нужен text или fileUrl',
      })
      .parse(request.body);
    const senderId = request.jwtUser.sub;
    const svc = new ChatService(fastify.prisma);
    let msg: ChatMessage;
    try {
      msg = await svc.sendMessage(roomId, senderId, {
        text: body.text ?? null,
        fileUrl: body.fileUrl ?? null,
        fileName: body.fileName ?? null,
        replyToId: body.replyToId ?? null,
        replyToText: body.replyToText ?? null,
        replyToSenderName: body.replyToSenderName ?? null,
      });
    } catch (e) {
      if (e instanceof Error && e.message === 'FORBIDDEN')
        return replyFail(reply, 403, 'FORBIDDEN', 'Нет доступа');
      if (e instanceof Error && e.message === 'EMPTY_MESSAGE')
        return replyFail(reply, 400, 'EMPTY_MESSAGE', 'Пустое сообщение');
      throw e;
    }
    const nsp = getNsp(fastify as FastifyChat);
    const payload = {
      roomId,
      message: serializeChatMessage(msg),
    };
    if (nsp) {
      nsp.to(`room:${roomId}`).emit('message:new', payload);
      const participants = await fastify.prisma.chatRoom.findUnique({
        where: { id: roomId },
        select: {
          worker: { select: { userId: true } },
          employer: { select: { userId: true } },
        },
      });
      if (participants) {
        const peerId =
          senderId === participants.worker.userId
            ? participants.employer.userId
            : participants.worker.userId;
        await bumpUnreadTotals(nsp, fastify.prisma, peerId);
      }
    }
    return replyOk(reply, { message: serializeChatMessage(msg) });
  });

  fastify.patch('/rooms/:id/read', { preHandler: pre }, async (request, reply) => {
    const { id: roomId } = request.params as { id: string };
    const userId = request.jwtUser.sub;
    const svc = new ChatService(fastify.prisma);
    let result: { count: number; messageIds: string[]; readAt: Date | null };
    try {
      result = await svc.markRead(roomId, userId);
    } catch (e) {
      if (e instanceof Error && e.message === 'FORBIDDEN')
        return replyFail(reply, 403, 'FORBIDDEN', 'Нет доступа');
      throw e;
    }
    const nsp = getNsp(fastify as FastifyChat);
    if (nsp && result.count > 0 && result.readAt) {
      nsp.to(`room:${roomId}`).emit('message:read', {
        roomId,
        messageIds: result.messageIds,
        readAt: result.readAt.toISOString(),
        readBy: userId,
      });
      await bumpUnreadTotals(nsp, fastify.prisma, userId);
      const room = await fastify.prisma.chatRoom.findUnique({
        where: { id: roomId },
        select: {
          worker: { select: { userId: true } },
          employer: { select: { userId: true } },
        },
      });
      if (room) {
        const peerId = userId === room.worker.userId ? room.employer.userId : room.worker.userId;
        await bumpUnreadTotals(nsp, fastify.prisma, peerId);
      }
    }
    return replyOk(reply, { ok: true, count: result.count });
  });

  fastify.get('/rooms/:id/messages', { preHandler: pre }, async (request, reply) => {
    const { id: roomId } = request.params as { id: string };
    const q = z
      .object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(50),
      })
      .parse(request.query);
    const userId = request.jwtUser.sub;
    const svc = new ChatService(fastify.prisma);
    try {
      const { data, meta } = await svc.getMessages(roomId, userId, q.page, q.limit);
      return replyPaginated(
        reply,
        { messages: data.map((m) => serializeChatMessage(m)) },
        meta as Record<string, unknown>,
      );
    } catch (e) {
      if (e instanceof Error && e.message === 'FORBIDDEN')
        return replyFail(reply, 403, 'FORBIDDEN', 'Нет доступа');
      throw e;
    }
  });
};
