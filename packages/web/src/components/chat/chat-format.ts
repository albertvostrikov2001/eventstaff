function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

export function formatChatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (isToday) return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
}

export function isSameDay(a: string, b: string): boolean {
  const x = new Date(a);
  const y = new Date(b);
  return x.getDate() === y.getDate() && x.getMonth() === y.getMonth() && x.getFullYear() === y.getFullYear();
}

const DAY = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'] as const;
const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
] as const;

export function dayDividerLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${DAY[d.getDay()]}`;
}
