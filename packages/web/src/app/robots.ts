import type { MetadataRoute } from 'next';
import { config } from '@/lib/config';

/**
 * /robots.txt — разрешаем индексацию публичной части, закрываем приватное
 * (кабинеты, авторизация, API, оплата). Указываем sitemap и host для Яндекса.
 *
 * Важно про префиксы: кабинеты — это `/worker/...` и `/employer/...` (с слешем),
 * публичные каталоги — `/workers` и `/employers` (множественное число), они НЕ
 * попадают под disallow `/worker/` и `/employer/`.
 */
export default function robots(): MetadataRoute.Robots {
  const base = config.siteUrl;
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/auth/',
          '/admin',
          '/dashboard',
          '/worker/',
          '/employer/',
          '/payment/',
          '/*?*sort=',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
