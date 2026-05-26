import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ShiftPayStatus, ShiftStatus } from '@prisma/client';
import { YookassaAdapter } from '@/payment/yookassa-adapter';
import { publicSiteUrl } from '@/lib/public-site-url';
import { replyFail, replyOk, replyPaginated } from '@/lib/api-reply';
import { SubscriptionService, type WorkerPlanKey, type EmployerPlanKey } from '@/services/subscription-service';

function paymentAdapterFromEnv() {
  const shopId = process.env.YOOKASSA_SHOP_ID?.trim() ?? '';
  const key = process.env.YOOKASSA_SECRET_KEY?.trim() ?? '';
  if (!shopId || !key) {
    return null;
  }
  return new YookassaAdapter(shopId, key);
}
function returnUrl(): string {
  return (
    process.env.PAYMENT_RETURN_URL?.trim() ||
    `${publicSiteUrl().replace(/\/$/, '')}/payment/return`
  );
}

function webhookSecret() {
  return process.env.YOOKASSA_WEBHOOK_SECRET?.trim();
}

export const paymentRoutes: FastifyPluginAsync = async (fastify) => {
  const authEmployer = [fastify.authenticate, fastify.requireRole(['employer'])];
  const authAny = [fastify.authenticate];
  const subSvc = new SubscriptionService(fastify.prisma);

  // POST /payments/create
  fastify.post('/create', { preHandler: authEmployer, config: { rateLimit: { max: 30 } } }, async (request, reply) => {
    const adapter = paymentAdapterFromEnv();
    if (!adapter) {
      return replyFail(reply, 503, 'PAYMENTS_UNAVAILABLE', 'Платежи временно недоступны');
    }
    const body = z.object({ shiftId: z.string() }).parse(request.body);
    const uid = request.jwtUser.sub;

    const shift = await fastify.prisma.shift.findUnique({
      where: { id: body.shiftId },
      include: { booking: true },
    });
    if (!shift) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Смена не найдена');
    }
    if (shift.employerId !== uid) {
      return replyFail(reply, 403, 'FORBIDDEN', 'Нет доступа');
    }
    if (shift.status !== ShiftStatus.COMPLETED) {
      return replyFail(reply, 400, 'INVALID_STATE', 'Смена должна быть успешно завершена');
    }
    if (!shift.workerConfirmed || !shift.employerConfirmed) {
      return replyFail(reply, 400, 'INVALID_STATE', 'Нужны подтверждения обеих сторон');
    }
    const previous = await fastify.prisma.shiftPayment.findUnique({ where: { shiftId: shift.id } });
    if (previous) {
      if (previous.status === ShiftPayStatus.FAILED) {
        await fastify.prisma.shiftPayment.delete({ where: { id: previous.id } });
      } else {
        return replyFail(reply, 400, 'ALREADY_PAID', 'Оплата по этой смене уже создана');
      }
    }

    const rate = shift.booking.rate;
    const amountRub = rate != null ? Math.max(1, Math.round(Number(rate))) : 1;

    const sp = await fastify.prisma.shiftPayment.create({
      data: {
        shiftId: shift.id,
        payerId: shift.employerId,
        payeeId: shift.workerId,
        amount: amountRub,
        currency: 'RUB',
        status: ShiftPayStatus.PENDING,
      },
    });

    const idem = sp.id;
    let providerId: string;
    let payUrl: string;
    try {
      const r = await adapter.createPayment({
        amountRub,
        description: `Оплата смены ${shift.id.slice(0, 8)}`,
        returnUrl: returnUrl(),
        idempotenceKey: idem,
        metadata: {
          shiftPaymentId: sp.id,
          shiftId: shift.id,
        },
      });
      providerId = r.providerPaymentId;
      payUrl = r.paymentUrl;
    } catch (e) {
      await fastify.prisma.shiftPayment.update({
        where: { id: sp.id },
        data: { status: ShiftPayStatus.FAILED, providerData: { error: 'create_failed' } },
      });
      fastify.log.error({ err: e, shiftPaymentId: sp.id }, 'yookassa_create_failed');
      return replyFail(reply, 502, 'GATEWAY', 'Не удалось создать платёж');
    }

    await fastify.prisma.shiftPayment.update({
      where: { id: sp.id },
      data: {
        providerPaymentId: providerId,
        status: ShiftPayStatus.PROCESSING,
        providerData: { yookassa: true },
      },
    });

    return replyOk(reply, { paymentUrl: payUrl, shiftPaymentId: sp.id, providerPaymentId: providerId });
  });

  // GET /payments/shift/:shiftId
  fastify.get<{ Params: { shiftId: string } }>(
    '/shift/:shiftId',
    { preHandler: authAny },
    async (request, reply) => {
      const { shiftId } = request.params;
      const uid = request.jwtUser.sub;
      const shift = await fastify.prisma.shift.findUnique({
        where: { id: shiftId },
        include: { payments: true },
      });
      if (!shift) {
        return replyFail(reply, 404, 'NOT_FOUND', 'Смена не найдена');
      }
      if (shift.workerId !== uid && shift.employerId !== uid) {
        return replyFail(reply, 403, 'FORBIDDEN', 'Нет доступа');
      }
      const p = shift.payments[0] ?? null;
      return replyOk(reply, p);
    },
  );

  // GET /payments/history — paginated
  fastify.get<{ Querystring: { page?: string; perPage?: string } }>(
    '/history',
    { preHandler: authAny },
    async (request, reply) => {
      const uid = request.jwtUser.sub;
      const asRole = request.jwtUser.activeRole;
      const where = asRole === 'employer' ? { payerId: uid } : { payeeId: uid };

      const page = Math.max(1, Number(request.query.page) || 1);
      const perPage = Math.min(50, Math.max(1, Number(request.query.perPage) || 20));
      const skip = (page - 1) * perPage;

      const [total, rows] = await Promise.all([
        fastify.prisma.shiftPayment.count({ where }),
        fastify.prisma.shiftPayment.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: perPage,
          include: {
            shift: {
              include: {
                booking: { select: { date: true, location: true } },
              },
            },
          },
        }),
      ]);

      return replyPaginated(reply, rows, {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      });
    },
  );

  // POST /payments/webhook
  fastify.post<{ Querystring: { secret?: string } }>(
    '/webhook',
    { config: { rateLimit: { max: 2000, timeWindow: '1 minute' } } },
    async (request: FastifyRequest<{ Querystring: { secret?: string } }>, reply: FastifyReply) => {
      const adapter = paymentAdapterFromEnv();
      if (!adapter) {
        return replyFail(reply, 503, 'PAYMENTS_UNAVAILABLE', 'Платежи временно недоступны');
      }
      if (!adapter.verifyWebhookRequest(request.query?.secret, webhookSecret())) {
        return replyFail(reply, 401, 'UNAUTHORIZED', 'Не авторизовано');
      }

      const parseResult = z
        .object({
          type: z.string().optional(),
          event: z.string().optional(),
          object: z
            .object({
              id: z.string().optional(),
              status: z.string().optional(),
            })
            .optional(),
        })
        .safeParse(request.body);

      if (!parseResult.success) {
        return replyFail(reply, 400, 'INVALID_BODY', 'Некорректное тело запроса');
      }
      const body = parseResult.data;
      const paymentId = body.object?.id;
      if (!paymentId) {
        return replyFail(reply, 400, 'NO_PAYMENT_ID', 'Нет идентификатора платежа');
      }

      let external;
      try {
        external = await adapter.getPayment(paymentId);
      } catch (e) {
        fastify.log.error({ err: e, providerPaymentId: paymentId }, 'yookassa_webhook_verify');
        return replyFail(reply, 502, 'VERIFY_FAILED', 'Не удалось проверить платёж');
      }

      // Check if this is a subscription payment
      const subscriptionPayment = await fastify.prisma.payment.findFirst({
        where: { providerPaymentId: paymentId, type: 'subscription' },
      });
      if (subscriptionPayment) {
        if (external.status === 'succeeded') {
          const meta = (subscriptionPayment.metadata ?? {}) as Record<string, string>;
          const role = meta.role;
          const plan = meta.plan;
          if (role === 'worker' && meta.workerId && plan) {
            await subSvc.grantWorkerSubscription(meta.workerId, plan as WorkerPlanKey, 1, false);
            await fastify.prisma.payment.update({
              where: { id: subscriptionPayment.id },
              data: { status: 'completed' },
            });
            await fastify.notificationService.create({
              userId: subscriptionPayment.userId,
              type: 'PAYMENT_RECEIVED',
              title: 'Подписка активирована',
              body: `Тариф Premium активирован на 1 месяц. Пользуйтесь всеми преимуществами!`,
              data: { plan },
            });
          } else if (role === 'employer' && meta.employerId && plan) {
            await subSvc.grantEmployerSubscription(meta.employerId, plan as EmployerPlanKey, 1, false);
            await fastify.prisma.payment.update({
              where: { id: subscriptionPayment.id },
              data: { status: 'completed' },
            });
            const label = plan === 'basic' ? 'Бизнес' : plan === 'pro' ? 'Про' : plan;
            await fastify.notificationService.create({
              userId: subscriptionPayment.userId,
              type: 'PAYMENT_RECEIVED',
              title: 'Тариф активирован',
              body: `Тариф ${label} активирован на 1 месяц. Все преимущества уже доступны.`,
              data: { plan },
            });
          }
        } else if (external.status === 'canceled') {
          await fastify.prisma.payment.update({
            where: { id: subscriptionPayment.id },
            data: { status: 'failed' },
          });
        }
        return replyOk(reply, { ok: true });
      }

      // Fall through to shift payment handling
      const shiftPay = await fastify.prisma.shiftPayment.findFirst({
        where: { providerPaymentId: paymentId },
        include: { shift: true },
      });
      if (!shiftPay) {
        fastify.log.warn({ providerPaymentId: paymentId }, 'yookassa_unknown_payment_id');
        return replyOk(reply, { ok: true });
      }

      if (shiftPay.status === ShiftPayStatus.COMPLETED) {
        return replyOk(reply, { ok: true });
      }

      const meta = (external.metadata ?? {}) as Record<string, string>;
      if (meta.shiftPaymentId && meta.shiftPaymentId !== shiftPay.id) {
        return replyFail(reply, 400, 'MISMATCH', 'Несовпадение метаданных');
      }
      if (Math.round(external.amountRub) !== shiftPay.amount) {
        fastify.log.error(
          { providerPaymentId: paymentId, shiftPaymentId: shiftPay.id },
          'yookassa_amount_mismatch',
        );
        return replyFail(reply, 400, 'AMOUNT_MISMATCH', 'Несовпадение суммы');
      }

      if (external.status === 'succeeded') {
        const paid = await fastify.prisma.shiftPayment.update({
          where: { id: shiftPay.id },
          data: {
            status: ShiftPayStatus.COMPLETED,
            paidAt: new Date(),
          },
        });
        const site = publicSiteUrl();
        await fastify.notificationService.create({
          userId: paid.payeeId,
          type: 'PAYMENT_RECEIVED',
          title: 'Оплата получена',
          body: 'Работодатель оплатил смену. Средства зачислены в соглашение по платформе.',
          data: { shiftPaymentId: paid.id, shiftId: paid.shiftId },
        });
        await fastify.notificationService.create({
          userId: paid.payerId,
          type: 'PAYMENT_RECEIVED',
          title: 'Оплата прошла успешно',
          body: 'Смена отмечена оплаченной. Спасибо, что пользуетесь Юнити.',
          data: { shiftPaymentId: paid.id, shiftId: paid.shiftId },
        });
        const worker = await fastify.prisma.user.findUnique({
          where: { id: paid.payeeId },
          include: { notificationPreferences: true, workerProfile: true },
        });
        const employer = await fastify.prisma.user.findUnique({
          where: { id: paid.payerId },
          include: { employerProfile: true },
        });
        if (worker?.email) {
          await fastify.emailService.queue({
            userId: paid.payeeId,
            to: worker.email,
            type: 'PAYMENT_RECEIVED',
            templateData: {
              body: 'Работодатель подтвердил оплату смены.',
              ctaUrl: `${site}/worker/earnings`,
            },
          });
        }
        if (employer?.email) {
          await fastify.emailService.queue({
            userId: paid.payerId,
            to: employer.email,
            type: 'PAYMENT_RECEIVED',
            templateData: {
              body: 'Платёж обработан. Смена отмечена как оплаченная.',
              ctaUrl: `${site}/employer/payments`,
            },
          });
        }
        return replyOk(reply, { ok: true });
      }

      if (external.status === 'canceled' || body.event === 'payment.canceled') {
        await fastify.prisma.shiftPayment.update({
          where: { id: shiftPay.id },
          data: { status: ShiftPayStatus.FAILED, providerData: { yookassaStatus: 'canceled' } },
        });
      }
      return replyOk(reply, { ok: true });
    },
  );
};
