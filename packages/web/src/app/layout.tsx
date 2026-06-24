import type { Metadata } from 'next';
import { Onest, JetBrains_Mono } from 'next/font/google';
import '@/styles/globals.css';
import { AuthProvider } from '@/providers/AuthProvider';
import { ToastProvider } from '@/components/ui/toast-context';
import { NetworkErrorBanner } from '@/components/common/NetworkErrorBanner';
import { CookieNotice } from '@/components/common/CookieNotice';
import { YandexMetrika } from '@/components/analytics/YandexMetrika';

import { config } from '@/lib/config';

let metadataBaseUrl: URL;
try {
  metadataBaseUrl = new URL(config.siteUrl);
} catch {
  metadataBaseUrl = new URL('https://albertvostrikov2001.github.io/eventstaff');
}

const onest = Onest({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-onest',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  weight: ['400', '500'],
  display: 'swap',
});

import { QueryProvider } from '@/providers/QueryProvider';

export const metadata: Metadata = {
  metadataBase: metadataBaseUrl,
  title: {
    default: 'Юнити — Платформа event-персонала',
    template: '%s | Юнити',
  },
  description:
    'Специализированная платформа для подбора event-персонала в ресторанном бизнесе и сфере гостеприимства. Быстро. Проверено. Профессионально.',
  keywords: [
    'event персонал',
    'персонал на мероприятие',
    'официант на мероприятие',
    'официант на банкет',
    'бармен на банкет',
    'хостес на мероприятие',
    'повар на мероприятие',
    'промоутер на акцию',
    'аниматор на праздник',
    'работа официантом',
    'подработка официантом',
    'подработка на мероприятиях',
    'кейтеринг персонал',
    'персонал для ресторана',
    'найм персонала на смену',
    'event агентство персонал',
    'официант Новороссийск',
    'персонал на мероприятие Новороссийск',
    'официант Анапа',
    'официант Краснодар',
  ],
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: 'Юнити',
    url: config.siteUrl,
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'Юнити — платформа event-персонала',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Юнити — Платформа event-персонала',
    description:
      'Подбор официантов, барменов и event-персонала для мероприятий, ресторанов и кейтеринга.',
    images: ['/logo.png'],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    yandex: 'e1f7eade0fd58c6a',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${onest.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <ToastProvider>
          <NetworkErrorBanner />
          <QueryProvider>
            <AuthProvider>{children}</AuthProvider>
          </QueryProvider>
          <CookieNotice />
        </ToastProvider>
        <YandexMetrika />
      </body>
    </html>
  );
}
