/**
 * Home stats strip — copy for CMS: numeric target + suffix + label.
 * Display strings are built at runtime (animated or static).
 */
export const statsContent = {
  items: [
    { id: 'profiles', target: 500, suffix: '+', label: 'Анкет в базе' },
    { id: 'time', target: 48, suffix: 'ч', label: 'Среднее время закрытия вакансии' },
    { id: 'retention', target: 97, suffix: '%', label: 'Работодателей вернулись повторно' },
    { id: 'year', target: 2026, suffix: '', label: 'Год основания' },
  ],
} as const;

export type StatsContentItem = (typeof statsContent.items)[number];
