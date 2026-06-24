import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { yookassaFromEnv } from '@/payment/yookassa-adapter';
import { fulfillPayment } from '@/services/payment-fulfillment';
import { replyFail, replyOk } from '@/lib/api-reply';
import { SubscriptionService } from '@/services/subscription-service';

// Оплата смен между работником и работодателем отключена. Здесь остаётся только
// обработка платежей платформы — подписок и бустов.
const paymentAdapterFromEnv = yookassaFromEnv;

function webhookSecret() {
  return process.env.YOOKASSA_WEBHOOK_SECRET?.trim();
}

export const paymentRoutes: FastifyPluginAsync = async (fastify) => {
  const authAny = [fastify.authenticate];
  const subSvc = new SubscriptionService(fastify.prisma);

  // POST /payments/verify — перепроверить недавние платежи пользователя и выдать.
  // Вызывается со страницы возврата, страхует от пропущенного вебхука.
  fastify.post('/verify', { preHandler: authAny, config: { rateLimit: { max: 30 } } }, async (request, reply) => {
    const adapter = paymentAdapterFromEnv();
    if (!adapter) return replyOk(reply, { granted: 0 });

    const uid = request.jwtUser.sub;
    const cutoff = new Date(Date.now() - 60 * 60 * 1000); // последний час
    const pendings = await fastify.prisma.payment.findMany({
      where: {
        userId: uid,
        status: 'pending',
        type: { in: ['subscription', 'boost'] },
        providerPaymentId: { not: null },
        createdAt: { gte: cutoff },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    let granted = 0;
    for (const p of pendings) {
      try {
        const r = await fulfillPayment(
          { prisma: fastify.prisma, subSvc, notify: fastify.notificationService, adapter },
          p,
        );
        if (r === 'granted') granted += 1;
      } catch (e) {
        fastify.log.warn({ err: e, paymentId: p.id }, 'verify_fulfill_failed');
      }
    }
    return replyOk(reply, { granted });
  });

  // POST /payments/webhook — выдача подписок и бустов (единая идемпотентная логика
  // на вебхуке, верификации на возврате и фоновой сверке).
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
      const paymentId = parseResult.data.object?.id;
      if (!paymentId) {
        return replyFail(reply, 400, 'NO_PAYMENT_ID', 'Нет идентификатора платежа');
      }

      const trackedPayment = await fastify.prisma.payment.findFirst({
        where: { providerPaymentId: paymentId, type: { in: ['subscription', 'boost'] } },
      });
      if (trackedPayment) {
        await fulfillPayment(
          { prisma: fastify.prisma, subSvc, notify: fastify.notificationService, adapter },
          trackedPayment,
        );
        return replyOk(reply, { ok: true });
      }

      fastify.log.warn({ providerPaymentId: paymentId }, 'yookassa_unknown_payment_id');
      return replyOk(reply, { ok: true });
    },
  );
};
