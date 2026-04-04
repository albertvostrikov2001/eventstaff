const TRANSLIT_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh',
  з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

/**
 * Transliterates a Russian string to a URL-safe slug.
 * ASSUMPTION A1: slug = firstName-lastName-city with dedup suffix.
 */
export function transliterate(text: string): string {
  return text
    .toLowerCase()
    .split('')
    .map((char) => TRANSLIT_MAP[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function generateSlug(firstName: string, lastName: string, city?: string): string {
  const parts = [firstName, lastName];
  if (city) parts.push(city);
  return transliterate(parts.join(' '));
}

export function formatRate(rate: number, rateType: string): string {
  const formatted = new Intl.NumberFormat('ru-RU').format(rate);
  const suffixes: Record<string, string> = {
    hourly: '/час',
    per_shift: '/смена',
    fixed: '',
    daily: '/день',
    weekly: '/неделя',
    after_event: '',
  };
  return `${formatted} ₽${suffixes[rateType] ?? ''}`;
}

export function formatPhone(phone: string): string {
  if (!phone || phone.length !== 12) return phone;
  return `${phone.slice(0, 2)} (${phone.slice(2, 5)}) ${phone.slice(5, 8)}-${phone.slice(8, 10)}-${phone.slice(10)}`;
}

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Calculates weighted average rating from the last N reviews.
 * ASSUMPTION A2: exponential time decay over the last 20 reviews.
 */
export function calculateWeightedRating(
  reviews: Array<{ rating: number; createdAt: Date }>,
  maxReviews = 20,
): number {
  if (reviews.length === 0) return 0;

  const recent = reviews
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, maxReviews);

  const now = Date.now();
  const DECAY_HALF_LIFE_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

  let weightedSum = 0;
  let totalWeight = 0;

  for (const review of recent) {
    const ageMs = now - review.createdAt.getTime();
    const weight = Math.exp((-Math.LN2 * ageMs) / DECAY_HALF_LIFE_MS);
    weightedSum += review.rating * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : 0;
}

export function pluralize(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${count} ${many}`;
  if (mod10 === 1) return `${count} ${one}`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} ${few}`;
  return `${count} ${many}`;
}
