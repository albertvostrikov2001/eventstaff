import type { InAppNotification, PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import type { InAppNotificationType } from '@prisma/client';
import type { PaginatedResult } from '@/types/pagination';

export type NotificationType = InAppNotificationType;

export class NotificationService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(params: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }): Promise<InAppNotification> {
    return this.prisma.inAppNotification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        data:
          params.data === undefined
            ? undefined
            : (params.data as Prisma.InputJsonValue),
      },
    });
  }

  async getForUser(
    userId: string,
    params: { page: number; limit: number; unreadOnly?: boolean },
  ): Promise<PaginatedResult<InAppNotification>> {
    const page = Math.max(1, params.page);
    const limit = Math.min(100, Math.max(1, params.limit));
    const where = {
      userId,
      ...(params.unreadOnly ? { isRead: false } : {}),
    };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.inAppNotification.count({ where }),
      this.prisma.inAppNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  async markRead(id: string, userId: string): Promise<void> {
    const res = await this.prisma.inAppNotification.updateMany({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
    });
    if (res.count === 0) {
      throw Object.assign(new Error('Not found'), { statusCode: 404 });
    }
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.inAppNotification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.inAppNotification.count({
      where: { userId, isRead: false },
    });
  }

  /** Unread counts grouped by notification type (for per-section nav badges). */
  async getUnreadSummary(userId: string): Promise<Record<string, number>> {
    const rows = await this.prisma.inAppNotification.groupBy({
      by: ['type'],
      where: { userId, isRead: false },
      _count: { _all: true },
    });
    const out: Record<string, number> = {};
    for (const r of rows) {
      out[r.type as string] = r._count._all;
    }
    return out;
  }

  /** Mark all unread notifications of the given types as read (clears a section badge). */
  async markReadByTypes(userId: string, types: NotificationType[]): Promise<number> {
    if (types.length === 0) return 0;
    const res = await this.prisma.inAppNotification.updateMany({
      where: { userId, isRead: false, type: { in: types } },
      data: { isRead: true, readAt: new Date() },
    });
    return res.count;
  }

  async ensurePreferences(userId: string) {
    await this.prisma.notificationPreferences.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }
}
