import type { Metadata } from 'next';
import { Onest, JetBrains_Mono } from 'next/font/google';
import '@/styles/globals.css';
import { AuthProvider } from '@/providers/AuthProvider';
import { ToastProvider } from '@/components/ui/toast-context';
import { NetworkErrorBanner } from '@/components/common/NetworkErrorBanner';
import { CookieNotice } from '@/components/common/CookieNotice';
import { YandexMetrika } from '@/components/analytics/YandexMetrika';

import { config } from '@/lib/config';

const TOP_MAIL_RU_COUNTER = `
var _tmr = window._tmr || (window._tmr = []);
_tmr.push({id: "3791253", type: "pageView", start: (new Date()).getTime()});
(function (d, w, id) {
  if (d.getElementById(id)) return;
  var ts = d.createElement("script"); ts.type = "text/javascript"; ts.async = true; ts.id = id;
  ts.src = "https://top-fwz1.mail.ru/js/code.js";
  var f = function () {var s = d.getElementsByTagName("script")[0]; s.parentNode.insertBefore(ts, s);};
  if (w.opera == "[object Opera]") { d.addEventListener("DOMContentLoaded", f, false); } else { f(); }
})(document, window, "tmr-code");
`;

const TOP_MAIL_RU_NOSCRIPT =
  '<div><img src="https://top-fwz1.mail.ru/counter?id=3791253;js=na" style="position:absolute;left:-9999px;" alt="Top.Mail.Ru" /></div>';

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
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner';

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
    google: 'Z8wWDz66fugRORfXmcXXDdFm3btDiqlqrpC1t96AGXA',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${onest.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <script
          id="top-mail-ru-counter"
          type="text/javascript"
          dangerouslySetInnerHTML={{ __html: TOP_MAIL_RU_COUNTER }}
        />
        <noscript dangerouslySetInnerHTML={{ __html: TOP_MAIL_RU_NOSCRIPT }} />
        <ToastProvider>
          <NetworkErrorBanner />
          <QueryProvider>
            <AuthProvider>{children}</AuthProvider>
          </QueryProvider>
          <CookieNotice />
          <ImpersonationBanner />
        </ToastProvider>
        <YandexMetrika />
      </body>
    </html>
  );
}
