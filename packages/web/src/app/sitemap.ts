import type { MetadataRoute } from 'next';
import { config } from '@/lib/config';
import {
  fetchVacanciesForSitemap,
  fetchWorkersForSitemap,
  fetchEmployersForSitemap,
  type SitemapEntity,
} from '@/lib/api/server-catalog';
import { PERSONNEL_CATEGORY_ORDER } from '@/content/personnelCategories';

const base = config.siteUrl;

/** Публичные статические маршруты с приоритетами для поисковиков. */
const STATIC_ROUTES: Array<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
}> = [
  { path: '', priority: 1.0, changeFrequency: 'daily' },
  { path: '/vacancies', priority: 0.9, changeFrequency: 'hourly' },
  { path: '/workers', priority: 0.9, changeFrequency: 'daily' },
  { path: '/personnel', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/employers', priority: 0.7, changeFrequency: 'daily' },
  { path: '/pricing', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/for-workers', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/for-employers', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/how-it-works', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/about', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/contacts', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/help', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/request', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/legal/offer', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/legal/privacy', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/legal/terms', priority: 0.2, changeFrequency: 'yearly' },
];

function lastMod(e: SitemapEntity, fallback: Date): Date {
  const raw = e.updatedAt ?? e.publishedAt;
  if (!raw) return fallback;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${base}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  // SEO-посадочные по категориям персонала.
  const personnelEntries: MetadataRoute.Sitemap = PERSONNEL_CATEGORY_ORDER.map((key) => ({
    url: `${base}/personnel/${key}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  // Динамика тянется из публичного каталога; при недоступности API — пустой список.
  const [vacancies, workers, employers] = await Promise.all([
    fetchVacanciesForSitemap(),
    fetchWorkersForSitemap(),
    fetchEmployersForSitemap(),
  ]);

  const vacancyEntries: MetadataRoute.Sitemap = vacancies.map((v) => ({
    url: `${base}/vacancies/${v.id}`,
    lastModified: lastMod(v, now),
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  const workerEntries: MetadataRoute.Sitemap = workers.map((w) => ({
    url: `${base}/workers/${w.id}`,
    lastModified: lastMod(w, now),
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  const employerEntries: MetadataRoute.Sitemap = employers.map((e) => ({
    url: `${base}/employers/${e.slug || e.id}`,
    lastModified: lastMod(e, now),
    changeFrequency: 'weekly',
    priority: 0.5,
  }));

  return [
    ...staticEntries,
    ...personnelEntries,
    ...vacancyEntries,
    ...workerEntries,
    ...employerEntries,
  ];
}
