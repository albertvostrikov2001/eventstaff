import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Briefcase, Users, Check, ArrowRight } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { config } from '@/lib/config';
import {
  PERSONNEL_CATEGORIES,
  PERSONNEL_CATEGORY_ORDER,
  getCategoryContent,
} from '@/content/personnelCategories';
import { CategoryWorkersGrid } from './CategoryWorkersGrid';

type Props = { params: { category: string } };

export function generateStaticParams() {
  return PERSONNEL_CATEGORY_ORDER.map((category) => ({ category }));
}

export function generateMetadata({ params }: Props): Metadata {
  const c = getCategoryContent(params.category);
  if (!c) return { title: 'Категория не найдена' };
  const canonical = `${config.siteUrl}/personnel/${c.key}`;
  return {
    title: c.metaTitle,
    description: c.metaDescription,
    keywords: c.keywords,
    alternates: { canonical },
    openGraph: {
      title: `${c.h1} | Юнити`,
      description: c.metaDescription,
      url: canonical,
      type: 'website',
    },
  };
}

export default function PersonnelCategoryPage({ params }: Props) {
  const c = getCategoryContent(params.category);
  if (!c) notFound();

  const base = config.siteUrl;
  const others = PERSONNEL_CATEGORY_ORDER.filter((k) => k !== c.key).map(
    (k) => PERSONNEL_CATEGORIES[k],
  );

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: base },
      { '@type': 'ListItem', position: 2, name: 'Персонал', item: `${base}/personnel` },
      { '@type': 'ListItem', position: 3, name: c.plural, item: `${base}/personnel/${c.key}` },
    ],
  };

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: c.h1,
    description: c.metaDescription,
    url: `${base}/personnel/${c.key}`,
    inLanguage: 'ru-RU',
    isPartOf: { '@type': 'WebSite', name: 'Юнити', url: base },
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--u-bg-dark)' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />

      <div className="container-page py-8">
        <Breadcrumbs
          items={[
            { label: 'Главная', href: '/' },
            { label: 'Персонал', href: '/personnel' },
            { label: c.plural },
          ]}
        />

        {/* Hero */}
        <section className="mt-2">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">{c.h1}</h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/70">{c.lead}</p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/workers?category=${c.key}`}
              className="inline-flex items-center justify-center gap-2 rounded-input bg-primary-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-600"
            >
              <Users className="h-4 w-4" />
              Подобрать: {c.plural.toLowerCase()}
            </Link>
            <Link
              href="/auth/register?role=worker"
              className="inline-flex items-center justify-center gap-2 rounded-input border border-white/15 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/[0.08]"
            >
              <Briefcase className="h-4 w-4" />
              Я ищу работу в этой сфере
            </Link>
          </div>
        </section>

        {/* Что делает специалист */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-white">Чем занимается специалист</h2>
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {c.tasks.map((t) => (
              <li key={t} className="flex items-start gap-2.5 text-sm text-white/70">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                {t}
              </li>
            ))}
          </ul>
        </section>

        {/* Живая сетка специалистов */}
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-white">{c.plural} на платформе</h2>
          <p className="mt-1 mb-5 text-sm text-white/55">
            Анкеты с опытом, рейтингом и ставкой. Зарегистрируйтесь как работодатель, чтобы связаться.
          </p>
          <CategoryWorkersGrid category={c.key} plural={c.plural} />
        </section>

        {/* Перелинковка на другие категории */}
        <section className="mt-14 border-t border-white/[0.08] pt-8">
          <h2 className="text-lg font-semibold text-white">Другие категории персонала</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {others.map((o) => (
              <Link
                key={o.key}
                href={`/personnel/${o.key}`}
                className="inline-flex items-center gap-1 rounded-input border border-white/[0.1] bg-white/[0.04] px-3.5 py-2 text-sm text-white/75 transition hover:border-emerald-500/40 hover:text-white"
              >
                {o.plural}
              </Link>
            ))}
          </div>
          <Link
            href="/personnel"
            className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-[var(--accent)] hover:underline"
          >
            Все категории персонала <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </div>
    </div>
  );
}
