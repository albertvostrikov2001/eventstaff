import type { PrismaClient } from '@prisma/client';

// ─── Plan definitions ─────────────────────────────────────────────────────────

export const WORKER_PLANS = {
  free: {
    key: 'free' as const,
    label: 'Бесплатно',
    price: 0,
    applicationsPerMonth: 5,
    hasPremiumBadge: false,
    hasHighlight: false,
    hasProfileStats: false,
    hasFreeBoost: false,
  },
  premium: {
    key: 'premium' as const,
    label: 'Premium',
    price: 290,
    applicationsPerMonth: -1, // unlimited
    hasPremiumBadge: true,
    hasHighlight: true,
    hasProfileStats: true,
    hasFreeBoost: true,
  },
} as const;

export const EMPLOYER_PLANS = {
  free: {
    key: 'free' as const,
    label: 'Старт',
    price: 0,
    maxActiveVacancies: 3,
    monthlyInvitations: 3,
    hasFullCatalog: false,
    hasAnalytics: false,
    maxTemplates: 0,
    monthlyBoosts: 0,
    hasVerifiedBadge: false,
  },
  basic: {
    key: 'basic' as const,
    label: 'Бизнес',
    price: 1990,
    maxActiveVacancies: 15,
    monthlyInvitations: 30,
    hasFullCatalog: true,
    hasAnalytics: true,
    maxTemplates: 5,
    monthlyBoosts: 1,
    hasVerifiedBadge: true,
  },
  pro: {
    key: 'pro' as const,
    label: 'Про',
    price: 4490,
    maxActiveVacancies: -1,
    monthlyInvitations: -1,
    hasFullCatalog: true,
    hasAnalytics: true,
    maxTemplates: -1,
    monthlyBoosts: 3,
    hasVerifiedBadge: true,
  },
  enterprise: {
    key: 'enterprise' as const,
    label: 'Enterprise',
    price: 0,
    maxActiveVacancies: -1,
    monthlyInvitations: -1,
    hasFullCatalog: true,
    hasAnalytics: true,
    maxTemplates: -1,
    monthlyBoosts: 10,
    hasVerifiedBadge: true,
  },
} as const;

export type WorkerPlanKey = keyof typeof WORKER_PLANS;
export type EmployerPlanKey = keyof typeof EMPLOYER_PLANS;

// ─── Subscription service ─────────────────────────────────────────────────────

export class SubscriptionService {
  constructor(private prisma: PrismaClient) {}

  // ── Worker ────────────────────────────────────────────────────────────────

  async getWorkerSubscription(workerId: string) {
    const sub = await this.prisma.workerSubscription.findUnique({
      where: { workerId },
    });

    const now = new Date();
    const isExpired = sub?.currentPeriodEnd ? sub.currentPeriodEnd < now : false;
    const planKey: WorkerPlanKey =
      sub && sub.status === 'active' && !isExpired ? (sub.plan as WorkerPlanKey) : 'free';

    return {
      ...WORKER_PLANS[planKey],
      raw: sub ?? null,
      status: sub?.status ?? 'active',
      currentPeriodEnd: sub?.currentPeriodEnd ?? null,
      grantedByAdmin: sub?.grantedByAdmin ?? false,
      isExpired,
    };
  }

  async canWorkerApply(workerId: string) {
    const sub = await this.getWorkerSubscription(workerId);
    if (sub.applicationsPerMonth === -1) {
      return { allowed: true, used: 0, limit: -1, plan: sub.key };
    }

    // Разовый буст «безлимитные отклики на месяц»
    const profile = await this.prisma.workerProfile.findUnique({
      where: { id: workerId },
      select: { unlimitedUntil: true },
    });
    if (profile?.unlimitedUntil && profile.unlimitedUntil > new Date()) {
      return { allowed: true, used: 0, limit: -1, plan: sub.key };
    }

    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const used = await this.prisma.application.count({
      where: {
        workerId,
        createdAt: { gte: start },
        status: { notIn: ['cancelled', 'rejected'] },
      },
    });

    return {
      allowed: used < sub.applicationsPerMonth,
      used,
      limit: sub.applicationsPerMonth,
      plan: sub.key,
    };
  }

  async grantWorkerSubscription(
    workerId: string,
    plan: WorkerPlanKey,
    months: number,
    grantedByAdmin = false,
  ) {
    const now = new Date();
    const end = plan === 'free' ? null : new Date(now.getFullYear(), now.getMonth() + months, now.getDate());

    return this.prisma.workerSubscription.upsert({
      where: { workerId },
      create: {
        workerId,
        plan,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: end,
        grantedByAdmin,
      },
      update: {
        plan,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: end,
        grantedByAdmin,
      },
    });
  }

  // ── Employer ──────────────────────────────────────────────────────────────

  async getEmployerSubscription(employerId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { employerId },
    });

    const now = new Date();
    const isExpired = sub?.currentPeriodEnd ? sub.currentPeriodEnd < now : false;
    const planKey: EmployerPlanKey =
      sub && sub.status === 'active' && !isExpired ? (sub.plan as EmployerPlanKey) : 'free';

    return {
      ...EMPLOYER_PLANS[planKey],
      raw: sub ?? null,
      status: sub?.status ?? 'active',
      currentPeriodEnd: sub?.currentPeriodEnd ?? null,
      grantedByAdmin: (sub as { grantedByAdmin?: boolean })?.grantedByAdmin ?? false,
      isExpired,
    };
  }

  async canEmployerCreateVacancy(employerId: string) {
    const sub = await this.getEmployerSubscription(employerId);
    if (sub.maxActiveVacancies === -1) {
      return { allowed: true, current: 0, limit: -1, plan: sub.key };
    }

    const current = await this.prisma.vacancy.count({
      where: {
        employerId,
        status: { in: ['active', 'paused'] },
      },
    });

    return {
      allowed: current < sub.maxActiveVacancies,
      current,
      limit: sub.maxActiveVacancies,
      plan: sub.key,
    };
  }

  async canEmployerInvite(employerId: string) {
    const sub = await this.getEmployerSubscription(employerId);

    if (sub.monthlyInvitations === 0) {
      return { allowed: false, used: 0, limit: 0, plan: sub.key };
    }
    if (sub.monthlyInvitations === -1) {
      return { allowed: true, used: 0, limit: -1, plan: sub.key };
    }

    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const used = await this.prisma.application.count({
      where: {
        vacancy: { employerId },
        status: { in: ['invited', 'confirmed', 'rejected'] },
        createdAt: { gte: start },
      },
    });

    return {
      allowed: used < sub.monthlyInvitations,
      used,
      limit: sub.monthlyInvitations,
      plan: sub.key,
    };
  }

  async grantEmployerSubscription(
    employerId: string,
    plan: EmployerPlanKey,
    months: number,
    grantedByAdmin = false,
  ) {
    const now = new Date();
    const end = plan === 'free' ? null : new Date(now.getFullYear(), now.getMonth() + months, now.getDate());

    const sub = await this.prisma.subscription.upsert({
      where: { employerId },
      create: {
        employerId,
        plan,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: end,
        grantedByAdmin,
      },
      update: {
        plan,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: end,
        grantedByAdmin,
      },
    });

    const planDef = EMPLOYER_PLANS[plan];
    // Auto-manage verified badge based on plan
    if (planDef.hasVerifiedBadge) {
      await this.prisma.employerProfile.update({
        where: { id: employerId },
        data: { isVerified: true },
      });
    } else {
      // Downgrade to free — restore to verifiedByAdmin state only
      const profile = await this.prisma.employerProfile.findUnique({
        where: { id: employerId },
        select: { verifiedByAdmin: true },
      });
      await this.prisma.employerProfile.update({
        where: { id: employerId },
        data: { isVerified: profile?.verifiedByAdmin ?? false },
      });
    }

    return sub;
  }
}
