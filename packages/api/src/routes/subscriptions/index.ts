import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { PaymentProvider, PaymentStatus, PaymentType } from '@prisma/client';
import { replyFail, replyOk } from '@/lib/api-reply';
import { YookassaAdapter } from '@/payment/yookassa-adapter';
import { publicSiteUrl } from '@/lib/public-site-url';
import {
  SubscriptionService,
  WORKER_PLANS,
  EMPLOYER_PLANS,
  type WorkerPlanKey,
  type EmployerPlanKey,
} from '@/services/subscription-service';

function adapter() {
  const shopId = process.env.YOOKASSA_SHOP_ID?.trim() ?? '';
  const key = process.env.YOOKASSA_SECRET_KEY?.trim() ?? '';
  return shopId && key ? new YookassaAdapter(shopId, key) : null;
}

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

    const site = publicSiteUrl();
    let payUrl: string;
    try {
      const r = await ya.createPayment({
        amountRub,
        description: `Подписка ${planDef.label} — 1 месяц`,
        returnUrl: `${site}/worker/subscription?payment_status=success`,
        idempotenceKey: payment.id,
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
      select: { id: true },
    });
    if (!profile) return replyFail(reply, 404, 'NOT_FOUND', 'Профиль не найден');

    const sub = await svc.getEmployerSubscription(profile.id);
    const canVacancy = await svc.canEmployerCreateVacancy(profile.id);
    const canInvite = await svc.canEmployerInvite(profile.id);

    return replyOk(reply, {
      ...sub,
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

    const site = publicSiteUrl();
    let payUrl: string;
    try {
      const r = await ya.createPayment({
        amountRub,
        description: `Тариф ${planDef.label} — 1 месяц`,
        returnUrl: `${site}/employer/subscription?payment_status=success`,
        idempotenceKey: payment.id,
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
};
