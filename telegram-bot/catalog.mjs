export function queryFor(user, page = 1, limit = 5) {
  const query = new URLSearchParams({ page: String(page), limit: String(limit), sortBy: 'createdAt', sortOrder: 'desc' });
  for (const key of ['category', 'cityId', 'rateMin', 'rateMax']) {
    if (user[key] !== undefined && user[key] !== '') query.set(key, String(user[key]));
  }
  if (user.date) {
    if (user.role === 'employer') query.set('availabilityDate', user.date);
    else {
      query.set('dateFrom', `${user.date}T00:00:00+03:00`);
      query.set('dateTo', `${user.date}T23:59:59.999+03:00`);
    }
  }
  return query;
}

export function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

export function parseRate(value) {
  const match = /^(\d+(?:\.\d{1,2})?)\s+(\d+(?:\.\d{1,2})?)$/.exec(value.trim());
  if (!match) return null;
  const [min, max] = match.slice(1).map(Number);
  return Number.isFinite(min) && Number.isFinite(max) && min <= max && max <= 100_000_000
    ? { rateMin: min, rateMax: max } : null;
}

export function newItems(items, seen) {
  const known = new Set(seen);
  return items.filter((item) => !known.has(item.id));
}

export function createCatalog(apiUrl, fetcher = fetch) {
  async function get(path, query) {
    const url = `${apiUrl.replace(/\/$/, '')}/catalog/${path}${query ? `?${query}` : ''}`;
    const response = await fetcher(url, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`Catalog HTTP ${response.status}`);
    const body = await response.json();
    if (body.success !== true || !Array.isArray(body.data)) throw new Error('Invalid catalog response');
    return body;
  }
  return {
    options: async (kind) => (await get(kind)).data,
    page: async (user, page = 1, limit = 5) => {
      const result = await get(user.role === 'worker' ? 'vacancies' : 'workers', queryFor(user, page, limit));
      if (!Number.isSafeInteger(result.meta?.totalPages) || result.meta.totalPages < 0) {
        throw new Error('Invalid catalog pagination');
      }
      return result;
    },
    async all(user) {
      const items = new Map();
      for (let page = 1; ; page++) {
        const result = await this.page(user, page, 100);
        for (const item of result.data) items.set(item.id, item);
        if (page >= result.meta.totalPages) return [...items.values()];
      }
    },
  };
}

export function recordUrl(siteUrl, user, item) {
  const path = user.role === 'worker' ? 'vacancies' : 'workers';
  return `${siteUrl.replace(/\/$/, '')}/${path}/${encodeURIComponent(item.slug || item.id)}`;
}

// Plain text: names and titles from the catalog cannot inject Telegram HTML/Markdown.
export function describe(user, item, categories = []) {
  const label = (key) => categories.find((c) => c.id === key)?.name || key;
  const money = (n) => Number.isFinite(Number(n)) ? Number(n).toLocaleString('ru-RU') : '—';
  const short = (text, length = 180) => String(text ?? '').replace(/[\r\n]+/g, ' ').slice(0, length);
  const period = { per_shift: 'за смену', monthly: 'в месяц', hourly: 'в час', daily: 'за день', weekly: 'за неделю', fixed: '', after_event: 'по итогам' };
  if (user.role === 'worker') {
    const date = item.dateStart && !Number.isNaN(Date.parse(item.dateStart))
      ? new Date(item.dateStart).toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow' }) : 'уточняется';
    return [short(item.title), label(item.category), short(item.employer?.companyName || item.employer?.contactName),
      short(item.city?.name), `Дата: ${date}`, `${money(item.rate)} ₽ ${period[item.rateType] || ''}`].filter(Boolean).join('\n');
  }
  return [short(`${item.firstName || ''} ${item.lastName || ''}`),
    (item.categories || []).map((c) => label(c.category)).join(', ').slice(0, 220), short(item.city?.name),
    item.desiredRate != null ? `Ставка: ${money(item.desiredRate)} ₽ ${period[item.rateType] || ''}` : 'Ставка: по договорённости',
    `Опыт: ${Number(item.experienceYears) || 0} лет`,
    item.ratingScore != null ? `Рейтинг: ${money(item.ratingScore)}` : null].filter(Boolean).join('\n');
}
