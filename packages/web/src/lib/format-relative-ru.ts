/** Компактное относительное время для списков откликов («5 мин назад»). */
export function formatRelativeTimeRu(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';

  let diffMs = Date.now() - t;
  if (diffMs < 0) diffMs = 0;

  const sec = Math.floor(diffMs / 1000);
  if (sec < 45) return 'только что';

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} мин назад`;

  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} ч назад`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} дн. назад`;

  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}
