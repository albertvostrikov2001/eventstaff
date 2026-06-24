import type { PrismaClient } from '@prisma/client';
import { getBoostSku, type BoostSku } from '@/payment/boost-catalog';

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

/** sku покупки → список единиц инвентаря, которые начисляются. Пакет разворачивается в единицы. */
export function purchaseUnits(sku: string): string[] {
  if (sku === 'employer_pack5') return Array.from({ length: 5 }, () => 'employer_top_24h');
  return [sku];
}

/**
 * Начисляет купленные бусты в инвентарь (НЕ активирует). Идемпотентно по paymentId.
 * Возвращает количество начисленных единиц.
 */
export async function creditBoostsFromPayment(
  prisma: PrismaClient,
  payment: { id: string; userId: string; metadata: unknown },
): Promise<number> {
  const meta = (payment.metadata ?? {}) as Record<string, string>;
  const sku = meta.sku;
  const item = sku ? getBoostSku(sku) : null;
  if (!item) return 0;

  const already = await prisma.purchasedBoost.count({ where: { paymentId: payment.id } });
  if (already > 0) return 0; // защита от повторного вебхука

  const units = purchaseUnits(sku);
  await prisma.purchasedBoost.createMany({
    data: units.map((u) => ({
      userId: payment.userId,
      audience: item.audience,
      sku: u,
      status: 'available',
      paymentId: payment.id,
    })),
  });
  return units.length;
}

/** Применяет эффект буста к конкретной цели. */
async function applyBoostEffect(
  prisma: PrismaClient,
  item: BoostSku,
  target: { workerProfileId?: string; employerProfileId?: string; vacancyId?: string },
): Promise<void> {
  const now = Date.now();
  const e = item.effect;
  switch (e.kind) {
    case 'worker_top':
      if (!target.workerProfileId) return;
      await prisma.workerProfile.update({
        where: { id: target.workerProfileId },
        data: { boostUntil: new Date(now + e.days * DAY_MS) },
      });
      break;
    case 'worker_unlimited': {
      if (!target.workerProfileId) return;
      const cur = await prisma.workerProfile.findUnique({
        where: { id: target.workerProfileId },
        select: { unlimitedUntil: true },
      });
      const base = cur?.unlimitedUntil && cur.unlimitedUntil.getTime() > now ? cur.unlimitedUntil.getTime() : now;
      await prisma.workerProfile.update({
        where: { id: target.workerProfileId },
        data: { unlimitedUntil: new Date(base + e.days * DAY_MS) },
      });
      break;
    }
    case 'worker_recommended': {
      if (!target.workerProfileId) return;
      const cur = await prisma.workerProfile.findUnique({
        where: { id: target.workerProfileId },
        select: { recommendedUntil: true },
      });
      const base = cur?.recommendedUntil && cur.recommendedUntil.getTime() > now ? cur.recommendedUntil.getTime() : now;
      await prisma.workerProfile.update({
        where: { id: target.workerProfileId },
        data: { recommendedUntil: new Date(base + e.days * DAY_MS) },
      });
      break;
    }
    case 'employer_vacancy_top':
      if (!target.vacancyId || !target.employerProfileId) return;
      await prisma.vacancyBoost.create({
        data: {
          vacancyId: target.vacancyId,
          employerId: target.employerProfileId,
          expiresAt: new Date(now + e.hours * HOUR_MS),
        },
      });
      break;
    case 'employer_vacancy_highlight':
      if (!target.vacancyId) return;
      await prisma.vacancy.update({
        where: { id: target.vacancyId },
        data: { highlightUntil: new Date(now + e.days * DAY_MS) },
      });
      break;
    case 'employer_credits':
      // В инвентарной модели не используется: пакет разворачивается в единицы при начислении.
      break;
  }
}

export type ActivateResult = { ok: true } | { ok: false; code: string; message: string };

/** Активирует купленный буст из инвентаря (вручную, из кабинета). */
export async function activateBoost(
  prisma: PrismaClient,
  userId: string,
  boostId: string,
  vacancyId: string | undefined,
): Promise<ActivateResult> {
  const row = await prisma.purchasedBoost.findUnique({ where: { id: boostId } });
  if (!row || row.userId !== userId) return { ok: false, code: 'NOT_FOUND', message: 'Буст не найден' };
  if (row.status !== 'available') return { ok: false, code: 'ALREADY_USED', message: 'Буст уже активирован' };

  const item = getBoostSku(row.sku);
  if (!item) return { ok: false, code: 'BAD_SKU', message: 'Неизвестный буст' };

  const target: { workerProfileId?: string; employerProfileId?: string; vacancyId?: string } = {};
  if (item.audience === 'worker') {
    const wp = await prisma.workerProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!wp) return { ok: false, code: 'NO_PROFILE', message: 'Профиль не найден' };
    target.workerProfileId = wp.id;
  } else {
    const ep = await prisma.employerProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!ep) return { ok: false, code: 'NO_PROFILE', message: 'Профиль не найден' };
    target.employerProfileId = ep.id;
    if (item.needsVacancy) {
      if (!vacancyId) return { ok: false, code: 'VACANCY_REQUIRED', message: 'Нужно выбрать вакансию' };
      const vac = await prisma.vacancy.findUnique({ where: { id: vacancyId }, select: { employerId: true } });
      if (!vac || vac.employerId !== ep.id) return { ok: false, code: 'FORBIDDEN', message: 'Вакансия не найдена' };
      target.vacancyId = vacancyId;
    }
  }

  await applyBoostEffect(prisma, item, target);
  await prisma.purchasedBoost.update({
    where: { id: row.id },
    data: { status: 'activated', activatedAt: new Date(), vacancyId: target.vacancyId ?? null },
  });
  return { ok: true };
}
