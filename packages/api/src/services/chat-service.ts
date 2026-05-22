import type { Prisma, PrismaClient } from '@prisma/client';
import { BookingStatus, type ChatRoomContextType, MessageType, type ChatMessage } from '@prisma/client';
import { buildSystemOpeningText, suggestOpenContextForPair } from '@/lib/chat-open-context';
import { hasLinkingContext, type WorkerEmployerIds } from '@/lib/can-chat';

export type ChatRoomWithParticipants = Prisma.ChatRoomGetPayload<{
  include: { worker: true; employer: true; order: { select: { id: true; date: true } } };
}>;

export class ChatService {
  constructor(private readonly prisma: PrismaClient) {}

  async isRoomParticipant(roomId: string, userId: string): Promise<boolean> {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        worker: { select: { userId: true } },
        employer: { select: { userId: true } },
      },
    });
    if (!room) return false;
    return room.worker.userId === userId || room.employer.userId === userId;
  }

  private async findActiveOrderId(pair: WorkerEmployerIds): Promise<string | null> {
    const b = await this.prisma.booking.findFirst({
      where: {
        workerId: pair.workerId,
        employerId: pair.employerId,
        status: { in: [BookingStatus.pending, BookingStatus.confirmed] },
      },
      orderBy: { date: 'desc' },
      select: { id: true },
    });
    return b?.id ?? null;
  }

  /**
   * One room per pair; opens with optional context or merges context onto existing row.
   */
  async openOrUpdateRoom(
    pair: WorkerEmployerIds,
    normalized: { contextType: ChatRoomContextType; contextId: string | null },
  ): Promise<{ room: ChatRoomWithParticipants; created: boolean }> {
    if (!(await hasLinkingContext(this.prisma, pair))) {
      throw new Error('CHAT_NOT_ALLOWED');
    }

    const orderId = await this.findActiveOrderId(pair);

    const existing = await this.prisma.chatRoom.findUnique({
      where: {
        workerId_employerId: { workerId: pair.workerId, employerId: pair.employerId },
      },
      include: { worker: true, employer: true, order: { select: { id: true, date: true } } },
    });

    if (existing) {
      const data: Prisma.ChatRoomUpdateInput = {};
      let changed = false;

      if (existing.contextType !== normalized.contextType || existing.contextId !== normalized.contextId) {
        data.contextType = normalized.contextType;
        data.contextId = normalized.contextId;
        changed = true;
      }
      if (orderId && !existing.orderId) {
        data.order = { connect: { id: orderId } };
        changed = true;
      }
      if (changed) {
        const updated = await this.prisma.chatRoom.update({
          where: { id: existing.id },
          data,
          include: { worker: true, employer: true, order: { select: { id: true, date: true } } },
        });
        return { room: updated, created: false };
      }
      return { room: existing, created: false };
    }

    const text = await buildSystemOpeningText(this.prisma, pair, normalized);
    const room = await this.prisma.$transaction(async (tx) => {
      const r = await tx.chatRoom.create({
        data: {
          workerId: pair.workerId,
          employerId: pair.employerId,
          orderId: orderId ?? undefined,
          contextType: normalized.contextType,
          contextId: normalized.contextId,
          lastMessageAt: new Date(),
        },
        include: { worker: true, employer: true, order: { select: { id: true, date: true } } },
      });
      const senderId = r.worker.userId;
      const sys = await tx.chatMessage.create({
        data: {
          roomId: r.id,
          senderId,
          type: MessageType.SYSTEM,
          text,
          isSystem: true,
          isRead: true,
          readAt: new Date(),
        },
      });
      await tx.chatRoom.update({
        where: { id: r.id },
        data: { lastMessageAt: sys.createdAt },
      });
      const full = await tx.chatRoom.findUniqueOrThrow({
        where: { id: r.id },
        include: { worker: true, employer: true, order: { select: { id: true, date: true } } },
      });
      return full;
    });
    return { room, created: true };
  }

  /** @deprecated use openOrUpdateRoom + explicit context — kept for callers without context payload */
  async getOrCreateRoom(pair: WorkerEmployerIds): Promise<{
    room: ChatRoomWithParticipants;
    created: boolean;
  }> {
    const normalized = await suggestOpenContextForPair(this.prisma, pair);
    return this.openOrUpdateRoom(pair, normalized);
  }

  async sendMessage(
    roomId: string,
    senderId: string,
    options: {
      text?: string | null;
      fileUrl?: string | null;
      fileName?: string | null;
      replyToId?: string | null;
      replyToText?: string | null;
      replyToSenderName?: string | null;
    },
  ): Promise<ChatMessage> {
    const trimmed = options.text?.trim() ?? null;
    const fileUrl = options.fileUrl?.trim() ?? null;
    if (!trimmed && !fileUrl) throw new Error('EMPTY_MESSAGE');

    const ok = await this.isRoomParticipant(roomId, senderId);
    if (!ok) throw new Error('FORBIDDEN');

    const msg = await this.prisma.$transaction(async (tx) => {
      const m = await tx.chatMessage.create({
        data: {
          roomId,
          senderId,
          type: fileUrl ? MessageType.FILE : MessageType.TEXT,
          text: trimmed,
          fileUrl: fileUrl,
          fileName: options.fileName?.trim() ?? null,
          replyToId: options.replyToId ?? null,
          replyToText: options.replyToText?.slice(0, 500) ?? null,
          replyToSenderName: options.replyToSenderName?.slice(0, 100) ?? null,
          isRead: false,
          isSystem: false,
        },
      });
      await tx.chatRoom.update({
        where: { id: roomId },
        data: { lastMessageAt: m.createdAt },
      });
      return m;
    });

    return msg;
  }

  async markRead(roomId: string, userId: string) {
    const ok = await this.isRoomParticipant(roomId, userId);
    if (!ok) throw new Error('FORBIDDEN');
    const pending = await this.prisma.chatMessage.findMany({
      where: {
        roomId,
        senderId: { not: userId },
        isRead: false,
        isSystem: false,
      },
      select: { id: true },
    });
    if (pending.length === 0) {
      return { count: 0, messageIds: [] as string[], readAt: null as Date | null };
    }
    const now = new Date();
    await this.prisma.chatMessage.updateMany({
      where: { id: { in: pending.map((m) => m.id) } },
      data: { isRead: true, readAt: now },
    });
    return { count: pending.length, messageIds: pending.map((m) => m.id), readAt: now };
  }

  async getMessages(roomId: string, userId: string, page: number, limit: number) {
    const ok = await this.isRoomParticipant(roomId, userId);
    if (!ok) throw new Error('FORBIDDEN');
    const take = Math.min(Math.max(1, limit), 100);
    const p = Math.max(1, page);
    const total = await this.prisma.chatMessage.count({ where: { roomId } });
    const totalPages = Math.max(1, Math.ceil(total / take));
    const skip = (p - 1) * take;
    const raw = await this.prisma.chatMessage.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
    const messages = raw.reverse();
    return {
      data: messages,
      meta: { page: p, limit: take, total, totalPages },
    };
  }

  async getTotalUnreadForUser(userId: string): Promise<number> {
    return this.prisma.chatMessage.count({
      where: {
        isRead: false,
        isSystem: false,
        senderId: { not: userId },
        room: {
          OR: [{ worker: { userId } }, { employer: { userId } }],
        },
      },
    });
  }

  async getRoomsForUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        workerProfile: { select: { id: true, userId: true } },
        employerProfile: { select: { id: true, userId: true } },
      },
    });
    if (!user) return [];

    const or: Prisma.ChatRoomWhereInput[] = [];
    if (user.workerProfile) {
      or.push({ workerId: user.workerProfile.id });
    }
    if (user.employerProfile) {
      or.push({ employerId: user.employerProfile.id });
    }
    if (or.length === 0) return [];

    return this.prisma.chatRoom.findMany({
      where: { OR: or },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        worker: true,
        employer: true,
        order: { select: { id: true, date: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            messages: {
              where: {
                isRead: false,
                isSystem: false,
                NOT: { senderId: userId },
              },
            },
          },
        },
      },
    });
  }
}
