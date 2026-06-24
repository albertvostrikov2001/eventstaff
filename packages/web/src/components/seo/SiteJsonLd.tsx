import { config } from '@/lib/config';
import { SITE_PHONE_DISPLAY, SITE_TELEGRAM_URL } from '@/content/siteContact';

/**
 * Сайтовый structured data (schema.org): Organization + WebSite.
 * Помогает поисковикам распознавать бренд «Юнити» (knowledge-панель,
 * корректный логотип и контакты в выдаче). Рендерится на публичных страницах.
 */
export function SiteJsonLd() {
  const base = config.siteUrl;

  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Юнити',
    alternateName: 'Unity — event-персонал',
    url: base,
    logo: `${base}/logo.png`,
    image: `${base}/logo.png`,
    description:
      'Платформа для поиска и найма event-персонала: официанты, бармены, хостес, повара и другой персонал для мероприятий, ресторанов и кейтеринга.',
    telephone: SITE_PHONE_DISPLAY,
    areaServed: 'RU',
    sameAs: [SITE_TELEGRAM_URL],
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'RU',
      addressRegion: 'Краснодарский край',
      addressLocality: 'Новороссийск',
      postalCode: '353900',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: SITE_PHONE_DISPLAY,
      contactType: 'customer support',
      email: 'Event-Unity@yandex.ru',
      availableLanguage: ['Russian'],
      hoursAvailable: {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '10:00',
        closes: '21:00',
      },
    },
  };

  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Юнити',
    url: base,
    inLanguage: 'ru-RU',
    publisher: { '@type': 'Organization', name: 'Юнити', url: base },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
    </>
  );
}
