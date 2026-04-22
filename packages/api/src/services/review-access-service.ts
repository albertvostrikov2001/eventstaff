import type { PrismaClient } from '@prisma/client';
import { UserReviewPlan } from '@prisma/client';

function limitForPlan(plan: UserReviewPlan): number {
  switch (plan) {
    case UserReviewPlan.FREE:
      return 3;
    case UserReviewPlan.BASIC:
      return 10;
    case UserReviewPlan.PRO:
      return Number.POSITIVE_INFINITY;
    default:
      return 3;
  }
}

/** @alias SubscriptionService (лимиты отзывов / просмотр профилей) */
export class ReviewAccessService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Лимит применяется к работодателям при просмотре отзывов о специалистах (другой пользователь = воркер).
   */
  async canViewReviews(
    viewerId: string,
    targetUserId: string,
  ): Promise<{
    allowed: boolean;
    remaining: number;
    limit: number;
    upgradeTo: 'BASIC' | 'PRO' | null;
  }> {
    if (viewerId === targetUserId) {
      return { allowed: true, remaining: 999, limit: 999, upgradeTo: null };
    }
    const targetHasWorker = await this.prisma.workerProfile.findUnique({
      where: { userId: targetUserId },
      select: { id: true },
    });
    if (!targetHasWorker) {
      return { allowed: true, remaining: 999, limit: 999, upgradeTo: null };
    }
    const viewer = await this.prisma.user.findUnique({
      where: { id: viewerId },
      include: { roles: true, employerProfile: true },
    });
    if (!viewer) {
      return { allowed: true, remaining: 999, limit: 999, upgradeTo: null };
    }
    const isEmployer = viewer.roles.some((r) => r.role === 'employer' || r.role === 'admin');
    if (!isEmployer) {
      return { allowed: true, remaining: 999, limit: 999, upgradeTo: null };
    }

    const sub = await this.prisma.userReviewSubscription.upsert({
      where: { userId: viewerId },
      create: { userId: viewerId, plan: UserReviewPlan.FREE, reviewsLimit: 3, reviewsUsed: 0 },
      update: {},
    });
    const limit =
      sub.plan === UserReviewPlan.PRO ? Number.POSITIVE_INFINITY : limitForPlan(sub.plan);

    const already = await this.prisma.reviewProfileView.findUnique({
      where: {
        viewerId_targetUserId: { viewerId, targetUserId },
      },
    });
    if (already) {
      const distinct = await this.prisma.reviewProfileView.count({ where: { viewerId } });
      const rem = limit === Number.POSITIVE_INFINITY ? 999 : Math.max(0, limit - distinct);
      return { allowed: true, remaining: rem, limit: limit === Number.POSITIVE_INFINITY ? 999 : limit, upgradeTo: null };
    }

    const used = await this.prisma.reviewProfileView.count({ where: { viewerId } });
    if (used >= limit) {
      return {
        allowed: false,
        remaining: 0,
        limit: limit === Number.POSITIVE_INFINITY ? 999 : limit,
        upgradeTo: sub.plan === UserReviewPlan.FREE ? 'BASIC' : 'PRO',
      };
    }
    const remaining = limit === Number.POSITIVE_INFINITY ? 999 : limit - used - 1;
    return {
      allowed: true,
      remaining: Math.max(0, remaining),
      limit: limit === Number.POSITIVE_INFINITY ? 999 : limit,
      upgradeTo: null,
    };
  }

  async trackReviewView(viewerId: string, targetUserId: string): Promise<void> {
    if (viewerId === targetUserId) return;
    const targetHasWorker = await this.prisma.workerProfile.findUnique({
      where: { userId: targetUserId },
      select: { id: true },
    });
    if (!targetHasWorker) return;
    const viewer = await this.prisma.user.findUnique({
      where: { id: viewerId },
      include: { roles: true },
    });
    if (!viewer?.roles.some((r) => r.role === 'employer' || r.role === 'admin')) {
      return;
    }

    const existing = await this.prisma.reviewProfileView.findUnique({
      where: { viewerId_targetUserId: { viewerId, targetUserId } },
    });
    if (existing) return;
    await this.prisma.reviewProfileView.create({
      data: { viewerId, targetUserId },
    });
    const n = await this.prisma.reviewProfileView.count({ where: { viewerId } });
    await this.prisma.userReviewSubscription.upsert({
      where: { userId: viewerId },
      create: { userId: viewerId, plan: UserReviewPlan.FREE, reviewsLimit: 3, reviewsUsed: n },
      update: { reviewsUsed: n },
    });
  }

  async getUsage(
    userId: string,
  ): Promise<{ used: number; limit: number; plan: UserReviewPlan; unlimited: boolean }> {
    const sub = await this.prisma.userReviewSubscription.upsert({
      where: { userId },
      create: { userId, plan: UserReviewPlan.FREE, reviewsLimit: 3, reviewsUsed: 0 },
      update: {},
    });
    const used = await this.prisma.reviewProfileView.count({ where: { viewerId: userId } });
    const lim = limitForPlan(sub.plan);
    const unlimited = lim === Number.POSITIVE_INFINITY;
    return {
      used,
      limit: unlimited ? 0 : lim,
      plan: sub.plan,
      unlimited,
    };
  }
}

export { ReviewAccessService as SubscriptionService };
