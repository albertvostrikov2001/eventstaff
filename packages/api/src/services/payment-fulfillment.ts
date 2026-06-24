import type { PrismaClient } from '@prisma/client';
import { getBoostSku } from '@/payment/boost-catalog';
import { creditBoostsFromPayment } from '@/services/boost-service';
import { SubscriptionService, type WorkerPlanKey, type EmployerPlanKey } from '@/services/subscription-service';
import type { PaymentAdapter } from '@/payment/payment-adapter';

export interface FulfillDeps {
  prisma: PrismaClient;
  subSvc: SubscriptionService;
  notify: {
    create(input: {
      userId: string;
      type: 'PAYMENT_RECEIVED';
      title: string;
      body: string;
      data?: Record<string, unknown>;
    }): Promise<unknown>;
  };
  adapter: PaymentAdapter;
}

export interface FulfillablePayment {
  id: string;
  userId: string;
  type: string;
  status: string;
  amount: unknown;
  providerPaymentId: string | null;
  metadata: unknown;
}

export type FulfillOutcome = 'granted' | 'noop' | 'canceled';

/**
 * Идемпотентно завершает оплату подписки/буста: перепроверяет статус платежа
 * в провайдере и, если `succeeded`, выдаёт услугу. Безопасна для повторных
 * вызовов (вебхук, верификация на возврате, фоновая сверка).
 */
export async function fulfillPayment(deps: FulfillDeps, payment: FulfillablePayment): Promise<FulfillOutcome> {
  if (!payment.providerPaymentId) return 'noop';
  if (payment.status === 'completed') return 'noop';

  const external = await deps.adapter.getPayment(payment.providerPaymentId);

  if (external.status === 'canceled') {
    if (payment.status !== 'failed') {
      await deps.prisma.payment.update({ where: { id: payment.id }, data: { status: 'failed' } });
    }
    return 'canceled';
  }
  if (external.status !== 'succeeded') return 'noop';

  // Защита от подмены суммы.
  if (Math.round(external.amountRub) !== Math.round(Number(payment.amount))) {
    return 'noop';
  }

  const meta = (payment.metadata ?? {}) as Record<string, string>;

  if (payment.type === 'subscription') {
    const role = meta.role;
    const plan = meta.plan;
    if (role === 'worker' && meta.workerId && plan) {
      await deps.subSvc.grantWorkerSubscription(meta.workerId, plan as WorkerPlanKey, 1, false);
      await deps.prisma.payment.update({ where: { id: payment.id }, data: { status: 'completed' } });
      await deps.notify.create({
        userId: payment.userId,
        type: 'PAYMENT_RECEIVED',
        title: 'Подписка активирована',
        body: 'Тариф Premium активирован на 1 месяц. Пользуйтесь всеми преимуществами!',
        data: { plan },
      });
      return 'granted';
    }
    if (role === 'employer' && meta.employerId && plan) {
      await deps.subSvc.grantEmployerSubscription(meta.employerId, plan as EmployerPlanKey, 1, false);
      await deps.prisma.payment.update({ where: { id: payment.id }, data: { status: 'completed' } });
      const label = plan === 'basic' ? 'Бизнес' : plan === 'pro' ? 'Про' : plan;
      await deps.notify.create({
        userId: payment.userId,
        type: 'PAYMENT_RECEIVED',
        title: 'Тариф активирован',
        body: `Тариф ${label} активирован на 1 месяц. Все преимущества уже доступны.`,
        data: { plan },
      });
      return 'granted';
    }
    return 'noop';
  }

  if (payment.type === 'boost') {
    const item = getBoostSku(meta.sku ?? '');
    await creditBoostsFromPayment(deps.prisma, payment);
    await deps.prisma.payment.update({ where: { id: payment.id }, data: { status: 'completed' } });
    await deps.notify.create({
      userId: payment.userId,
      type: 'PAYMENT_RECEIVED',
      title: 'Буст начислен',
      body: item
        ? `«${item.label}» начислен. Активируйте его в кабинете в разделе «Мои бусты».`
        : 'Буст начислен в кабинет.',
      data: { sku: meta.sku ?? '' },
    });
    return 'granted';
  }

  return 'noop';
}

/**
 * Фоновая сверка: до-выдаёт все «висящие» платежи подписок/бустов, по которым
 * вебхук не сработал. Возвращает количество выданных.
 */
export async function reconcilePendingPayments(deps: FulfillDeps, olderThanMs = 60_000, max = 50): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanMs);
  const pending = await deps.prisma.payment.findMany({
    where: {
      status: 'pending',
      type: { in: ['subscription', 'boost'] },
      providerPaymentId: { not: null },
      createdAt: { lt: cutoff },
    },
    orderBy: { createdAt: 'asc' },
    take: max,
  });

  let granted = 0;
  for (const p of pending) {
    try {
      const r = await fulfillPayment(deps, p);
      if (r === 'granted') granted += 1;
    } catch {
      // одиночная ошибка не должна валить весь проход
    }
  }
  return granted;
}
