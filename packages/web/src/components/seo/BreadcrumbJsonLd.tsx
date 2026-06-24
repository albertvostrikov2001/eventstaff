import { config } from '@/lib/config';

export interface BreadcrumbItem {
  /** Название раздела. */
  name: string;
  /** Путь от корня, напр. '/pricing'. Для последнего элемента можно опустить. */
  path?: string;
}

/**
 * BreadcrumbList (schema.org) для ключевых разделов — помогает поисковикам и ИИ
 * понимать структуру сайта и положение страницы.
 */
export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const base = config.siteUrl;
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      ...(it.path ? { item: `${base}${it.path}` } : {}),
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
