import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { config } from '@/lib/config';
import { PERSONNEL_CATEGORIES, PERSONNEL_CATEGORY_ORDER } from '@/content/personnelCategories';

const canonical = `${config.siteUrl}/personnel`;

export const metadata: Metadata = {
  title: 'Персонал для мероприятий — категории специалистов',
  description:
    'Подбор персонала для мероприятий по категориям: официанты, бармены, повара, хостес, бариста, диджеи и другие специалисты. Найм проверенных людей на смену через Юнити.',
  keywords: [
    'персонал для мероприятий',
    'персонал на мероприятие',
    'event персонал',
    'нанять персонал на смену',
    'официанты бармены повара на мероприятие',
  ],
  alternates: { canonical },
  openGraph: {
    title: 'Персонал для мероприятий по категориям | Юнити',
    description:
      'Официанты, бармены, повара, хостес, бариста и другие специалисты для мероприятий. Быстрый найм на платформе Юнити.',
    url: canonical,
    type: 'website',
  },
};

export default function PersonnelHubPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--u-bg-dark)' }}>
      <div className="container-page py-8">
        <Breadcrumbs items={[{ label: 'Главная', href: '/' }, { label: 'Персонал' }]} />

        <section className="mt-2">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">Персонал для мероприятий</h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/70">
            Выберите категорию персонала для вашего мероприятия — от официантов и барменов до
            хостес, бариста и технического персонала. На каждой странице собраны проверенные
            специалисты с опытом, рейтингом и ставками. Наймите команду под свой формат события
            или оставьте заявку на подбор.
          </p>
        </section>

        <section className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PERSONNEL_CATEGORY_ORDER.map((key) => {
            const c = PERSONNEL_CATEGORIES[key];
            return (
              <Link
                key={key}
                href={`/personnel/${key}`}
                className="group flex flex-col rounded-card border border-white/[0.08] bg-white/[0.04] p-5 transition hover:border-emerald-500/40 hover:bg-white/[0.06]"
              >
                <h2 className="text-lg font-semibold text-white group-hover:text-[var(--accent)]">
                  {c.plural}
                </h2>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-white/60">{c.lead}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--accent)]">
                  Подробнее <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </section>
      </div>
    </div>
  );
}
