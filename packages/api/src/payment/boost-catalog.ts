/**
 * Серверный каталог платных бустов (разовые услуги с тарифной страницы).
 * Цены и эффекты задаются ТОЛЬКО здесь — клиент передаёт лишь sku.
 */

export type BoostAudience = 'worker' | 'employer';

export type BoostEffect =
  | { kind: 'worker_top'; days: number }
  | { kind: 'worker_unlimited'; days: number }
  | { kind: 'worker_recommended'; days: number }
  | { kind: 'employer_vacancy_top'; hours: number }
  | { kind: 'employer_vacancy_highlight'; days: number }
  | { kind: 'employer_credits'; credits: number };

export interface BoostSku {
  sku: string;
  audience: BoostAudience;
  label: string;
  price: number; // ₽
  /** Требуется выбрать конкретную вакансию (буст/выделение вакансии). */
  needsVacancy: boolean;
  effect: BoostEffect;
}

export const BOOST_CATALOG: Record<string, BoostSku> = {
  // ── Работник ──────────────────────────────────────────────────────────
  worker_top_3d: {
    sku: 'worker_top_3d', audience: 'worker', label: 'Буст анкеты в топ — 3 дня',
    price: 149, needsVacancy: false, effect: { kind: 'worker_top', days: 3 },
  },
  worker_top_7d: {
    sku: 'worker_top_7d', audience: 'worker', label: 'Буст анкеты в топ — 7 дней',
    price: 299, needsVacancy: false, effect: { kind: 'worker_top', days: 7 },
  },
  worker_unlimited_30d: {
    sku: 'worker_unlimited_30d', audience: 'worker', label: 'Безлимитные отклики — 1 месяц',
    price: 199, needsVacancy: false, effect: { kind: 'worker_unlimited', days: 30 },
  },
  worker_recommended_30d: {
    sku: 'worker_recommended_30d', audience: 'worker', label: 'Бейдж «Рекомендован платформой» — 30 дней',
    price: 490, needsVacancy: false, effect: { kind: 'worker_recommended', days: 30 },
  },
  // ── Работодатель ──────────────────────────────────────────────────────
  employer_top_24h: {
    sku: 'employer_top_24h', audience: 'employer', label: 'Топ-буст вакансии — 24 часа',
    price: 490, needsVacancy: true, effect: { kind: 'employer_vacancy_top', hours: 24 },
  },
  employer_top_7d: {
    sku: 'employer_top_7d', audience: 'employer', label: 'Топ-буст вакансии — 7 дней',
    price: 1990, needsVacancy: true, effect: { kind: 'employer_vacancy_top', hours: 168 },
  },
  employer_highlight_7d: {
    sku: 'employer_highlight_7d', audience: 'employer', label: 'Выделение вакансии цветом — 7 дней',
    price: 290, needsVacancy: true, effect: { kind: 'employer_vacancy_highlight', days: 7 },
  },
  employer_pack5: {
    sku: 'employer_pack5', audience: 'employer', label: 'Пакет «5 топ-бустов»',
    price: 1990, needsVacancy: false, effect: { kind: 'employer_credits', credits: 5 },
  },
};

export function getBoostSku(sku: string): BoostSku | null {
  return BOOST_CATALOG[sku] ?? null;
}
