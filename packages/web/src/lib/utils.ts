import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Выбирает правильную форму русского слова по числу.
 * @param n число
 * @param forms [одна, две-четыре, пять] — например ['год', 'года', 'лет']
 */
export function pluralRu(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n) % 100;
  const n1 = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (n1 > 1 && n1 < 5) return forms[1];
  if (n1 === 1) return forms[0];
  return forms[2];
}

/** «3 года», «1 год», «5 лет». */
export function yearsLabel(n: number): string {
  return `${n} ${pluralRu(n, ['год', 'года', 'лет'])}`;
}
