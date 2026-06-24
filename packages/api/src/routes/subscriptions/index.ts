import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { PaymentProvider, PaymentStatus, PaymentType } from '@prisma/client';
import { replyFail, replyOk } from '@/lib/api-reply';
import { yookassaFromEnv } from '@/payment/yookassa-adapter';
import { getBoostSku } from '@/payment/boost-catalog';
import { activateBoost } from '@/services/boost-service';
import { publicSiteUrl } from '@/lib/public-site-url';
import {
  SubscriptionService,
  WORKER_PLANS,
  EMPLOYER_PLANS,
  type WorkerPlanKey,
  type EmployerPlanKey,
} from '@/services/subscription-service';

const adapter = yookassaFromEnv;

export const subscriptionRoutes: FastifyPluginAsync = async (fastify) => {
  const workerAuth = [fastify.authenticate, fastify.requireRole(['worker'])];
  const employerAuth = [fastify.authenticate, fastify.requireRole(['employer'])];

  const svc = new SubscriptionService(fastify.prisma);

  // ── GET /subscriptions/worker/me ──────────────────────────────────────────
  fastify.get('/worker/me', { preHandler: workerAuth }, async (request, reply) => {
    const profile = await fastify.prisma.workerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
      select: { id: true },
    });
    if (!profile) return replyFail(reply, 404, 'NOT_FOUND', 'Профиль не найден');

    const sub = await svc.getWorkerSubscription(profile.id);
    const canApply = await svc.canWorkerApply(profile.id);

    return replyOk(reply, {
      ...sub,
      usage: { applications: canApply },
      plans: WORKER_PLANS,
    });
  });

  // ── POST /subscriptions/worker/checkout ───────────────────────────────────
  fastify.post('/worker/checkout', { preHandler: workerAuth }, async (request, reply) => {
    const { plan } = z
      .object({ plan: z.enum(['premium']) })
      .parse(request.body);

    const ya = adapter();
    if (!ya) return replyFail(reply, 503, 'PAYMENTS_UNAVAILABLE', 'Платежи временно недоступны');

    const profile = await fastify.prisma.workerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
      select: { id: true },
    });
    if (!profile) return replyFail(reply, 404, 'NOT_FOUND', 'Профиль не найден');

    const planDef = WORKER_PLANS[plan as WorkerPlanKey];
    const amountRub = planDef.price;

    const payment = await fastify.prisma.payment.create({
      data: {
        userId: request.jwtUser.sub,
        amount: amountRub,
        currency: 'RUB',
        provider: PaymentProvider.yookassa,
        type: PaymentType.subscription,
        status: PaymentStatus.pending,
        metadata: {
          role: 'worker',
          plan,
          workerId: profile.id,
        },
      },
    });

    const buyer = await fastify.prisma.user.findUnique({
      where: { id: request.jwtUser.sub },
      select: { email: true },
    });

    const site = publicSiteUrl();
    let payUrl: string;
    try {
      const r = await ya.createPayment({
        amountRub,
        description: `Подписка ${planDef.label} — 1 месяц`,
        returnUrl: `${site}/worker/subscription?payment_status=success`,
        idempotenceKey: payment.id,
        customerEmail: buyer?.email ?? undefined,
        metadata: {
          paymentId: payment.id,
          role: 'worker',
          plan,
          workerId: profile.id,
        },
      });
      await fastify.prisma.payment.update({
        where: { id: payment.id },
        data: { providerPaymentId: r.providerPaymentId, status: PaymentStatus.pending },
      });
      payUrl = r.paymentUrl;
    } catch (e) {
      await fastify.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.failed },
      });
      fastify.log.error({ err: e }, 'subscription_checkout_failed');
      return replyFail(reply, 502, 'GATEWAY', 'Не удалось создать платёж');
    }

    return replyOk(reply, { paymentUrl: payUrl, paymentId: payment.id });
  });

  // ── GET /subscriptions/employer/me ────────────────────────────────────────
  fastify.get('/employer/me', { preHandler: employerAuth }, async (request, reply) => {
    const profile = await fastify.prisma.employerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
      select: { id: true, boostCredits: true },
    });
    if (!profile) return replyFail(reply, 404, 'NOT_FOUND', 'Профиль не найден');

    const sub = await svc.getEmployerSubscription(profile.id);
    const canVacancy = await svc.canEmployerCreateVacancy(profile.id);
    const canInvite = await svc.canEmployerInvite(profile.id);

    return replyOk(reply, {
      ...sub,
      boostCredits: profile.boostCredits,
      usage: {
        vacancies: canVacancy,
        invitations: canInvite,
      },
      plans: EMPLOYER_PLANS,
    });
  });

  // ── POST /subscriptions/employer/checkout ─────────────────────────────────
  fastify.post('/employer/checkout', { preHandler: employerAuth }, async (request, reply) => {
    const { plan } = z
      .object({ plan: z.enum(['basic', 'pro']) })
      .parse(request.body);

    const ya = adapter();
    if (!ya) return replyFail(reply, 503, 'PAYMENTS_UNAVAILABLE', 'Платежи временно недоступны');

    const profile = await fastify.prisma.employerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
      select: { id: true },
    });
    if (!profile) return replyFail(reply, 404, 'NOT_FOUND', 'Профиль не найден');

    const planDef = EMPLOYER_PLANS[plan as EmployerPlanKey];
    const amountRub = planDef.price;

    const payment = await fastify.prisma.payment.create({
      data: {
        userId: request.jwtUser.sub,
        amount: amountRub,
        currency: 'RUB',
        provider: PaymentProvider.yookassa,
        type: PaymentType.subscription,
        status: PaymentStatus.pending,
        metadata: {
          role: 'employer',
          plan,
          employerId: profile.id,
        },
      },
    });

    const buyer = await fastify.prisma.user.findUnique({
      where: { id: request.jwtUser.sub },
      select: { email: true },
    });

    const site = publicSiteUrl();
    let payUrl: string;
    try {
      const r = await ya.createPayment({
        amountRub,
        description: `Тариф ${planDef.label} — 1 месяц`,
        returnUrl: `${site}/employer/subscription?payment_status=success`,
        idempotenceKey: payment.id,
        customerEmail: buyer?.email ?? undefined,
        metadata: {
          paymentId: payment.id,
          role: 'employer',
          plan,
          employerId: profile.id,
        },
      });
      await fastify.prisma.payment.update({
        where: { id: payment.id },
        data: { providerPaymentId: r.providerPaymentId, status: PaymentStatus.pending },
      });
      payUrl = r.paymentUrl;
    } catch (e) {
      await fastify.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.failed },
      });
      fastify.log.error({ err: e }, 'subscription_checkout_failed');
      return replyFail(reply, 502, 'GATEWAY', 'Не удалось создать платёж');
    }

    return replyOk(reply, { paymentUrl: payUrl, paymentId: payment.id });
  });

  // ── POST /subscriptions/worker/boost-checkout ─────────────────────────────
  fastify.post('/worker/boost-checkout', { preHandler: workerAuth }, async (request, reply) => {
    const { sku } = z.object({ sku: z.string() }).parse(request.body);
    const item = getBoostSku(sku);
    if (!item || item.audience !== 'worker') {
      return replyFail(reply, 400, 'BAD_SKU', 'Неизвестная услуга');
    }

    const ya = adapter();
    if (!ya) return replyFail(reply, 503, 'PAYMENTS_UNAVAILABLE', 'Платежи временно недоступны');

    const profile = await fastify.prisma.workerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
      select: { id: true },
    });
    if (!profile) return replyFail(reply, 404, 'NOT_FOUND', 'Профиль не найден');

    const payment = await fastify.prisma.payment.create({
      data: {
        userId: request.jwtUser.sub,
        amount: item.price,
        currency: 'RUB',
        provider: PaymentProvider.yookassa,
        type: PaymentType.boost,
        status: PaymentStatus.pending,
        metadata: { kind: 'boost', sku: item.sku, workerId: profile.id },
      },
    });

    const buyer = await fastify.prisma.user.findUnique({
      where: { id: request.jwtUser.sub },
      select: { email: true },
    });
    const site = publicSiteUrl();
    let payUrl: string;
    try {
      const r = await ya.createPayment({
        amountRub: item.price,
        description: item.label,
        returnUrl: `${site}/worker/subscription?payment_status=success`,
        idempotenceKey: payment.id,
        customerEmail: buyer?.email ?? undefined,
        metadata: { paymentId: payment.id, kind: 'boost', sku: item.sku, workerId: profile.id },
      });
      await fastify.prisma.payment.update({
        where: { id: payment.id },
        data: { providerPaymentId: r.providerPaymentId },
      });
      payUrl = r.paymentUrl;
    } catch (e) {
      await fastify.prisma.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.failed } });
      fastify.log.error({ err: e }, 'boost_checkout_failed');
      return replyFail(reply, 502, 'GATEWAY', 'Не удалось создать платёж');
    }
    return replyOk(reply, { paymentUrl: payUrl, paymentId: payment.id });
  });

  // ── POST /subscriptions/employer/boost-checkout ───────────────────────────
  fastify.post('/employer/boost-checkout', { preHandler: employerAuth }, async (request, reply) => {
    const { sku, vacancyId } = z
      .object({ sku: z.string(), vacancyId: z.string().optional() })
      .parse(request.body);
    const item = getBoostSku(sku);
    if (!item || item.audience !== 'employer') {
      return replyFail(reply, 400, 'BAD_SKU', 'Неизвестная услуга');
    }

    const ya = adapter();
    if (!ya) return replyFail(reply, 503, 'PAYMENTS_UNAVAILABLE', 'Платежи временно недоступны');

    const profile = await fastify.prisma.employerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
      select: { id: true },
    });
    if (!profile) return replyFail(reply, 404, 'NOT_FOUND', 'Профиль не найден');

    if (item.needsVacancy) {
      if (!vacancyId) return replyFail(reply, 400, 'VACANCY_REQUIRED', 'Нужно выбрать вакансию');
      const vac = await fastify.prisma.vacancy.findUnique({
        where: { id: vacancyId },
        select: { employerId: true },
      });
      if (!vac || vac.employerId !== profile.id) {
        return replyFail(reply, 403, 'FORBIDDEN', 'Вакансия не найдена');
      }
    }

    const meta: Record<string, string> = { kind: 'boost', sku: item.sku, employerId: profile.id };
    if (item.needsVacancy && vacancyId) meta.vacancyId = vacancyId;

    const payment = await fastify.prisma.payment.create({
      data: {
        userId: request.jwtUser.sub,
        amount: item.price,
        currency: 'RUB',
        provider: PaymentProvider.yookassa,
        type: PaymentType.boost,
        status: PaymentStatus.pending,
        metadata: meta,
      },
    });

    const buyer = await fastify.prisma.user.findUnique({
      where: { id: request.jwtUser.sub },
      select: { email: true },
    });
    const site = publicSiteUrl();
    let payUrl: string;
    try {
      const r = await ya.createPayment({
        amountRub: item.price,
        description: item.label,
        returnUrl: `${site}/employer/subscription?payment_status=success`,
        idempotenceKey: payment.id,
        customerEmail: buyer?.email ?? undefined,
        metadata: { paymentId: payment.id, ...meta },
      });
      await fastify.prisma.payment.update({
        where: { id: payment.id },
        data: { providerPaymentId: r.providerPaymentId },
      });
      payUrl = r.paymentUrl;
    } catch (e) {
      await fastify.prisma.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.failed } });
      fastify.log.error({ err: e }, 'boost_checkout_failed');
      return replyFail(reply, 502, 'GATEWAY', 'Не удалось создать платёж');
    }
    return replyOk(reply, { paymentUrl: payUrl, paymentId: payment.id });
  });

  // ── Инвентарь купленных бустов (общая логика) ─────────────────────────────
  async function listBoosts(userId: string) {
    const rows = await fastify.prisma.purchasedBoost.findMany({
      where: { userId, status: 'available' },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => {
      const item = getBoostSku(r.sku);
      return {
        id: r.id,
        sku: r.sku,
        label: item?.label ?? r.sku,
        needsVacancy: item?.needsVacancy ?? false,
        createdAt: r.createdAt,
      };
    });
  }

  // GET /subscriptions/worker/boosts — мои купленные (неактивированные) бусты
  fastify.get('/worker/boosts', { preHandler: workerAuth }, async (request, reply) => {
    return replyOk(reply, await listBoosts(request.jwtUser.sub));
  });

  // GET /subscriptions/employer/boosts
  fastify.get('/employer/boosts', { preHandler: employerAuth }, async (request, reply) => {
    return replyOk(reply, await listBoosts(request.jwtUser.sub));
  });

  // POST /subscriptions/worker/boosts/:id/activate
  fastify.post<{ Params: { id: string } }>(
    '/worker/boosts/:id/activate',
    { preHandler: workerAuth },
    async (request, reply) => {
      const res = await activateBoost(fastify.prisma, request.jwtUser.sub, request.params.id, undefined);
      if (!res.ok) return replyFail(reply, 400, res.code, res.message);
      return replyOk(reply, { ok: true });
    },
  );

  // POST /subscriptions/employer/boosts/:id/activate  { vacancyId? }
  fastify.post<{ Params: { id: string } }>(
    '/employer/boosts/:id/activate',
    { preHandler: employerAuth },
    async (request, reply) => {
      const { vacancyId } = z.object({ vacancyId: z.string().optional() }).parse(request.body ?? {});
      const res = await activateBoost(fastify.prisma, request.jwtUser.sub, request.params.id, vacancyId);
      if (!res.ok) return replyFail(reply, 400, res.code, res.message);
      return replyOk(reply, { ok: true });
    },
  );
};
