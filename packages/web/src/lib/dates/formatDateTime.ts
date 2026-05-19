import { format, isValid, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

export type DateDisplayFormat = 'short' | 'long' | 'datetime' | 'date';

function toDate(input: string | Date): Date {
  return typeof input === 'string' ? parseISO(input) : input;
}

/** Единый вывод дат/времени для списков, карточек и детальных страниц (ru). */
export function formatDateTimeRu(
  input: string | Date | null | undefined,
  mode: DateDisplayFormat,
): string {
  if (!input) return '';
  const d = toDate(input);
  if (!isValid(d)) return '';

  switch (mode) {
    case 'short':
      return format(d, "d MMM, HH:mm", { locale: ru });
    case 'long':
      return format(d, "d MMMM yyyy, HH:mm", { locale: ru });
    case 'datetime':
      return format(d, "d MMMM yyyy 'г.', HH:mm", { locale: ru });
    case 'date':
    default:
      return format(d, 'd MMMM yyyy', { locale: ru });
  }
}
