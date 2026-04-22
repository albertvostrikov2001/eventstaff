import type { Prisma, PrismaClient } from '@prisma/client';
import { ApplicationStatus, BookingStatus, MessageType } from '@prisma/client';
import { hasLinkingContext, type WorkerEmployerIds } from '@/lib/can-chat';

const APP_STATUSES_VACANCY: ApplicationStatus[] = [
  ApplicationStatus.invited,
  ApplicationStatus.interview,
  ApplicationStatus.confirmed,
  ApplicationStatus.shift_started,
  ApplicationStatus.completed,
];

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

  private async systemMessageForNewRoom(pair: WorkerEmployerIds): Promise<string> {
    const application = await this.prisma.application.findFirst({
      where: {
        workerId: pair.workerId,
        status: { in: APP_STATUSES_VACANCY },
        vacancy: { employerId: pair.employerId },
      },
      orderBy: { updatedAt: 'desc' },
      include: { vacancy: { select: { title: true } } },
    });
    if (application?.vacancy?.title) {
      return `Чат открыт в рамках отклика на вакансию «${application.vacancy.title}».`;
    }
    const booking = await this.prisma.booking.findFirst({
      where: { workerId: pair.workerId, employerId: pair.employerId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (booking) {
      return 'Чат открыт в рамках заказа между вами.';
    }
    return 'Чат открыт. Общайтесь в рамках вашей сделки на платформе.';
  }

  /**
   * @param pair worker/employer profile ids (one worker, one employer).
   */
  async getOrCreateRoom(pair: WorkerEmployerIds): Promise<{
    room: Prisma.ChatRoomGetPayload<{
      include: { worker: true; employer: true; order: true };
    }>;
    created: boolean;
  }> {
    if (!(await hasLinkingContext(this.prisma, pair))) {
      throw new Error('CHAT_NOT_ALLOWED');
    }

    const orderId = await this.findActiveOrderId(pair);

    const existing = await this.prisma.chatRoom.findUnique({
      where: {
        workerId_employerId: { workerId: pair.workerId, employerId: pair.employerId },
      },
      include: { worker: true, employer: true, order: true },
    });
    if (existing) {
      if (orderId && !existing.orderId) {
        const updated = await this.prisma.chatRoom.update({
          where: { id: existing.id },
          data: { orderId },
          include: { worker: true, employer: true, order: true },
        });
        return { room: updated, created: false };
      }
      return { room: existing, created: false };
    }

    const text = await this.systemMessageForNewRoom(pair);
    const room = await this.prisma.$transaction(async (tx) => {
      const r = await tx.chatRoom.create({
        data: {
          workerId: pair.workerId,
          employerId: pair.employerId,
          orderId: orderId ?? undefined,
        },
        include: { worker: true, employer: true, order: true },
      });
      // System line: "от имени" платформы — sender = worker user, помечаем isSystem
      const senderId = r.worker.userId;
      await tx.chatMessage.create({
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
      return r;
    });
    return { room, created: true };
  }

  async sendMessage(roomId: string, senderId: string, text: string) {
    const trimmed = text?.trim() ?? '';
    if (!trimmed) {
      throw new Error('EMPTY_MESSAGE');
    }
    const ok = await this.isRoomParticipant(roomId, senderId);
    if (!ok) throw new Error('FORBIDDEN');
    return this.prisma.chatMessage.create({
      data: {
        roomId,
        senderId,
        type: MessageType.TEXT,
        text: trimmed,
        isRead: false,
        isSystem: false,
      },
    });
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
          OR: [
            { worker: { userId } },
            { employer: { userId } },
          ],
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

    const rooms = await this.prisma.chatRoom.findMany({
      where: { OR: or },
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

    return [...rooms].sort((a, b) => {
      const ta = a.messages[0]?.createdAt.getTime() ?? a.createdAt.getTime();
      const tb = b.messages[0]?.createdAt.getTime() ?? b.createdAt.getTime();
      return tb - ta;
    });
  }
}
