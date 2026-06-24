'use client';

/**
 * Хранит "намерение откликнуться" гостя через регистрацию/вход.
 * Query-параметр теряется на шаге email-верификации, поэтому используем localStorage.
 */
const KEY = 'unity_pending_apply';

export function setPendingApply(vacancyId: string): void {
  try {
    if (vacancyId) localStorage.setItem(KEY, vacancyId);
  } catch {
    /* ignore */
  }
}

export function popPendingApply(): string | null {
  try {
    const v = localStorage.getItem(KEY);
    if (v) localStorage.removeItem(KEY);
    return v || null;
  } catch {
    return null;
  }
}
