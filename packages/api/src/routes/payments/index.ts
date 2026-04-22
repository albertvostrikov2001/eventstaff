import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ShiftPayStatus, ShiftStatus } from '@prisma/client';
import { YookassaAdapter } from '@/payment/yookassa-adapter';
import { publicSiteUrl } from '@/lib/public-site-url';

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

  // POST /payments/create
  fastify.post('/create', { preHandler: authEmployer, config: { rateLimit: { max: 30 } } }, async (request, reply) => {
    const adapter = paymentAdapterFromEnv();
    if (!adapter) {
      return reply.status(503).send({
        error: { code: 'PAYMENTS_DISABLED', message: 'Платежи не настроены' },
      });
    }
    const body = z.object({ shiftId: z.string() }).parse(request.body);
    const uid = request.jwtUser.sub;

    const shift = await fastify.prisma.shift.findUnique({
      where: { id: body.shiftId },
      include: { booking: true },
    });
    if (!shift) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Смена не найдена' } });
    }
    if (shift.employerId !== uid) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Нет доступа' } });
    }
    if (shift.status !== ShiftStatus.COMPLETED) {
      return reply
        .status(400)
        .send({ error: { code: 'INVALID_STATE', message: 'Смена должна быть успешно завершена' } });
    }
    if (!shift.workerConfirmed || !shift.employerConfirmed) {
      return reply.status(400).send({
        error: { code: 'INVALID_STATE', message: 'Нужны подтверждения обеих сторон' },
      });
    }
    const previous = await fastify.prisma.shiftPayment.findUnique({ where: { shiftId: shift.id } });
    if (previous) {
      if (previous.status === ShiftPayStatus.FAILED) {
        await fastify.prisma.shiftPayment.delete({ where: { id: previous.id } });
      } else {
        return reply
          .status(400)
          .send({ error: { code: 'ALREADY_PAID', message: 'Оплата по этой смене уже создана' } });
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
      return reply
        .status(502)
        .send({ error: { code: 'GATEWAY', message: 'Не удалось создать платёж' } });
    }

    await fastify.prisma.shiftPayment.update({
      where: { id: sp.id },
      data: {
        providerPaymentId: providerId,
        status: ShiftPayStatus.PROCESSING,
        providerData: { yookassa: true },
      },
    });

    return reply.send({
      data: { paymentUrl: payUrl, shiftPaymentId: sp.id, providerPaymentId: providerId },
    });
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
        return reply.status(404).send({ error: { code: 'NOT_FOUND' } });
      }
      if (shift.workerId !== uid && shift.employerId !== uid) {
        return reply.status(403).send({ error: { code: 'FORBIDDEN' } });
      }
      const p = shift.payments[0] ?? null;
      return reply.send({ data: p });
    },
  );

  // GET /payments/history  (спецификация: /dashboard/payments)
  fastify.get('/history', { preHandler: authAny }, async (request, reply) => {
    const uid = request.jwtUser.sub;
    const asRole = request.jwtUser.activeRole;
    const where =
      asRole === 'employer' ? { payerId: uid } : { payeeId: uid };
    const rows = await fastify.prisma.shiftPayment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        shift: {
          include: {
            booking: { select: { date: true, location: true } },
          },
        },
      },
    });
    return reply.send({ data: rows });
  });

  // POST /payments/webhook
  fastify.post<{ Querystring: { secret?: string } }>(
    '/webhook',
    { config: { rateLimit: { max: 2000, timeWindow: '1 minute' } } },
    async (request: FastifyRequest<{ Querystring: { secret?: string } }>, reply: FastifyReply) => {
      const adapter = paymentAdapterFromEnv();
      if (!adapter) {
        return reply.status(503).send({ error: { code: 'PAYMENTS_DISABLED' } });
      }
      if (!adapter.verifyWebhookRequest(request.query?.secret, webhookSecret())) {
        return reply.status(401).send({ error: { code: 'UNAUTHORIZED' } });
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
        return reply.status(400).send({ error: { code: 'INVALID_BODY' } });
      }
      const body = parseResult.data;
      const paymentId = body.object?.id;
      if (!paymentId) {
        return reply.status(400).send({ error: { code: 'NO_PAYMENT_ID' } });
      }

      let external;
      try {
        external = await adapter.getPayment(paymentId);
      } catch (e) {
        fastify.log.error({ err: e, providerPaymentId: paymentId }, 'yookassa_webhook_verify');
        return reply.status(502).send({ error: { code: 'VERIFY_FAILED' } });
      }

      const shiftPay = await fastify.prisma.shiftPayment.findFirst({
        where: { providerPaymentId: paymentId },
        include: { shift: true },
      });
      if (!shiftPay) {
        fastify.log.warn({ providerPaymentId: paymentId }, 'yookassa_unknown_payment_id');
        return reply.send({ ok: true });
      }

      if (shiftPay.status === ShiftPayStatus.COMPLETED) {
        return reply.send({ ok: true });
      }

      const meta = (external.metadata ?? {}) as Record<string, string>;
      if (meta.shiftPaymentId && meta.shiftPaymentId !== shiftPay.id) {
        return reply.status(400).send({ error: { code: 'MISMATCH' } });
      }
      if (Math.round(external.amountRub) !== shiftPay.amount) {
        fastify.log.error(
          { providerPaymentId: paymentId, shiftPaymentId: shiftPay.id },
          'yookassa_amount_mismatch',
        );
        return reply.status(400).send({ error: { code: 'AMOUNT_MISMATCH' } });
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
        return reply.send({ ok: true });
      }

      if (external.status === 'canceled' || body.event === 'payment.canceled') {
        await fastify.prisma.shiftPayment.update({
          where: { id: shiftPay.id },
          data: { status: ShiftPayStatus.FAILED, providerData: { yookassaStatus: 'canceled' } },
        });
      }
      return reply.send({ ok: true });
    },
  );
};
