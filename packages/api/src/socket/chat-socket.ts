import { Server, type Namespace, type Socket } from 'socket.io';
import type { FastifyInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    chatNsp: Namespace;
  }
}
import { z } from 'zod';
import { getCookieValue, verifyAccessToken } from '@/lib/jwt-access';
import { ChatService } from '@/services/chat-service';
import { MessageType, type ChatMessage } from '@prisma/client';

function isLocalBrowserOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  try {
    const u = new URL(origin);
    return u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1');
  } catch {
    return false;
  }
}

function extraCorsOrigins(): string[] {
  return process.env.CORS_ORIGINS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean) ?? [];
}

function toOrigin(urlOrOrigin: string): string | null {
  const s = urlOrOrigin.trim();
  if (!s) return null;
  try {
    if (s.startsWith('http://') || s.startsWith('https://')) {
      return new URL(s).origin;
    }
  } catch {
    return null;
  }
  return s;
}

function productionCorsOrigins(): string[] {
  const out = new Set<string>();
  for (const raw of extraCorsOrigins()) {
    const o = toOrigin(raw);
    if (o) out.add(o);
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) {
    const o = toOrigin(site);
    if (o) out.add(o);
  }
  return [...out];
}

function socketCorsOk(origin: string | undefined): boolean {
  if (!origin) return true;
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    if (isLocalBrowserOrigin(origin)) return true;
    if (extraCorsOrigins().includes(origin)) return true;
    return false;
  }
  return productionCorsOrigins().includes(origin);
}

type SocketData = { userId: string };

function socketUser(socket: Socket): string {
  return (socket.data as SocketData).userId;
}

async function resolveUserId(socket: Socket): Promise<string | null> {
  const cookie = getCookieValue(socket.handshake.headers.cookie, 'access_token');
  const auth = socket.handshake.auth as { token?: string } | undefined;
  const token = cookie || auth?.token;
  if (!token) return null;
  const p = await verifyAccessToken(token);
  return p?.sub ?? null;
}

function emitUnreadForUser(
  nsp: import('socket.io').Namespace,
  prisma: import('@prisma/client').PrismaClient,
  userId: string,
) {
  const svc = new ChatService(prisma);
  void (async () => {
    const total = await svc.getTotalUnreadForUser(userId);
    nsp.to(`user:${userId}`).emit('unread:update', { total });
  })();
}

export function attachChatSocket(fastify: FastifyInstance) {
  const io = new Server(fastify.server, {
    path: '/socket.io/',
    serveClient: false,
    cors: {
      origin: (origin, cb) => {
        if (socketCorsOk(origin)) return cb(null, true);
        return cb(new Error('Not allowed by CORS'), false);
      },
      credentials: true,
    },
  });
  const nsp = io.of('/chat');
  const chatService = new ChatService(fastify.prisma);

  nsp.use(async (socket, next) => {
    const userId = await resolveUserId(socket);
    if (!userId) {
      return next(new Error('UNAUTHORIZED'));
    }
    (socket.data as SocketData).userId = userId;
    next();
  });

  nsp.on('connection', (socket) => {
    const userId = socketUser(socket);
    void socket.join(`user:${userId}`);

    void (async () => {
      const total = await chatService.getTotalUnreadForUser(userId);
      socket.emit('unread:update', { total });
    })();

    socket.on('room:join', async (raw, ack) => {
      try {
        const { roomId } = z.object({ roomId: z.string() }).parse(raw);
        const allowed = await chatService.isRoomParticipant(roomId, userId);
        if (!allowed) {
          const err = { code: 'FORBIDDEN', message: 'Нет доступа к чату' };
          socket.emit('error', err);
          ack?.(err);
          return;
        }
        await socket.join(`room:${roomId}`);
        ack?.({ ok: true });
      } catch (e) {
        const err = { code: 'INVALID', message: e instanceof Error ? e.message : 'Invalid' };
        socket.emit('error', err);
        ack?.(err);
      }
    });

    socket.on('message:send', async (raw) => {
      const parsed = z
        .object({ roomId: z.string(), text: z.string().max(8000), clientId: z.string().optional() })
        .safeParse(raw);
      if (!parsed.success) {
        socket.emit('error', { code: 'INVALID', message: 'Проверьте данные сообщения' });
        return;
      }
      const { roomId, text, clientId } = parsed.data;
      let msg: ChatMessage;
      try {
        msg = await chatService.sendMessage(roomId, userId, text);
      } catch (e) {
        if (e instanceof Error && e.message === 'FORBIDDEN') {
          socket.emit('error', { code: 'FORBIDDEN', message: 'Нет доступа' });
          return;
        }
        if (e instanceof Error && e.message === 'EMPTY_MESSAGE') {
          socket.emit('error', { code: 'INVALID', message: 'Пустое сообщение' });
          return;
        }
        socket.emit('error', { code: 'SEND_FAILED', message: 'Не удалось отправить' });
        return;
      }
      const payload = {
        roomId,
        message: toMessageDto(msg) as object,
        clientId,
      };
      nsp.to(`room:${roomId}`).emit('message:new', payload);

      const room = await fastify.prisma.chatRoom.findUnique({
        where: { id: roomId },
        include: { worker: { select: { userId: true } }, employer: { select: { userId: true } } },
      });
      if (room) {
        const peerId =
          userId === room.worker.userId ? room.employer.userId : room.worker.userId;
        emitUnreadForUser(nsp, fastify.prisma, peerId);
      }
    });

    socket.on('message:read', async (raw) => {
      const parsed = z.object({ roomId: z.string() }).safeParse(raw);
      if (!parsed.success) {
        socket.emit('error', { code: 'INVALID', message: 'roomId' });
        return;
      }
      const { roomId } = parsed.data;
      let result: { count: number; messageIds: string[]; readAt: Date | null };
      try {
        result = await chatService.markRead(roomId, userId);
      } catch (e) {
        if (e instanceof Error && e.message === 'FORBIDDEN') {
          socket.emit('error', { code: 'FORBIDDEN', message: 'Нет доступа' });
        }
        return;
      }
      if (result.count > 0 && result.readAt) {
        nsp.to(`room:${roomId}`).emit('message:read', {
          roomId,
          messageIds: result.messageIds,
          readAt: result.readAt.toISOString(),
          readBy: userId,
        });
        emitUnreadForUser(nsp, fastify.prisma, userId);
        const room = await fastify.prisma.chatRoom.findUnique({
          where: { id: roomId },
          include: { worker: { select: { userId: true } }, employer: { select: { userId: true } } },
        });
        if (room) {
          const peerId =
            userId === room.worker.userId ? room.employer.userId : room.worker.userId;
          emitUnreadForUser(nsp, fastify.prisma, peerId);
        }
      }
    });
  });

  fastify.decorate('chatNsp', nsp);
  fastify.addHook('onClose', async () => {
    await io.close();
  });
}

type ChatMsgDto = {
  id: string;
  roomId: string;
  senderId: string;
  type: MessageType;
  text: string | null;
  isRead: boolean;
  readAt: string | null;
  isSystem: boolean;
  createdAt: string;
};

function toMessageDto(m: ChatMessage): ChatMsgDto {
  return {
    id: m.id,
    roomId: m.roomId,
    senderId: m.senderId,
    type: m.type,
    text: m.text,
    isRead: m.isRead,
    readAt: m.readAt?.toISOString() ?? null,
    isSystem: m.isSystem,
    createdAt: m.createdAt.toISOString(),
  };
}
