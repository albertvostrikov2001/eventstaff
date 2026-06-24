import type { Metadata } from 'next';
import PricingClient from './PricingClient';
import { config } from '@/lib/config';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';

export const metadata: Metadata = {
  title: 'Тарифы',
  description: 'Тарифные планы платформы Юнити для работодателей и специалистов event-индустрии. Бесплатный старт, профессиональные планы.',
  alternates: { canonical: '/pricing' },
};

/** Тарифы для schema.org (цены синхронны с PricingClient). */
const PLAN_OFFERS = [
  { name: 'Старт', price: '0', period: null, audience: 'Работодателям', description: 'Бесплатный тариф для работодателей: до 3 активных вакансий, входящие отклики.' },
  { name: 'Бизнес', price: '1990', period: 'мес', audience: 'Работодателям', description: 'Для активного найма: до 15 вакансий, полный каталог, 30 приглашений в месяц, аналитика.' },
  { name: 'Про', price: '4490', period: 'мес', audience: 'Работодателям', description: 'Безлимит вакансий и приглашений, расширенная аналитика, vip-доступ для крупного найма.' },
  { name: 'Premium', price: '290', period: 'мес', audience: 'Специалистам', description: 'Премиум-подписка для специалистов: безлимит откликов, приоритет и выделение анкеты в каталоге.' },
];

export default function PricingPage() {
  const base = config.siteUrl;
  const offerCatalog = {
    '@context': 'https://schema.org',
    '@type': 'OfferCatalog',
    name: 'Тарифы Юнити',
    url: `${base}/pricing`,
    itemListElement: PLAN_OFFERS.map((p) => ({
      '@type': 'Offer',
      name: p.name,
      price: p.price,
      priceCurrency: 'RUB',
      category: p.audience,
      description: p.description,
      url: `${base}/pricing`,
      availability: 'https://schema.org/InStock',
      ...(p.period
        ? {
            priceSpecification: {
              '@type': 'UnitPriceSpecification',
              price: p.price,
              priceCurrency: 'RUB',
              unitText: 'MONTH',
            },
          }
        : {}),
    })),
  };

  return (
    <>
      <BreadcrumbJsonLd items={[{ name: 'Главная', path: '/' }, { name: 'Тарифы', path: '/pricing' }]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(offerCatalog) }}
      />
      <PricingClient />
    </>
  );
}
