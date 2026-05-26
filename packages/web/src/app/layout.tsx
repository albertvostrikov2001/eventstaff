import type { Metadata } from 'next';
import { Onest, JetBrains_Mono } from 'next/font/google';
import '@/styles/globals.css';
import { AuthProvider } from '@/providers/AuthProvider';
import { ToastProvider } from '@/components/ui/toast-context';
import { NetworkErrorBanner } from '@/components/common/NetworkErrorBanner';

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
    'официант на мероприятие',
    'бармен на банкет',
    'работа официантом',
    'подработка в ресторане',
    'кейтеринг персонал',
    'Новороссийск',
  ],
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: 'Юнити',
  },
  robots: {
    index: true,
    follow: true,
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
        </ToastProvider>
      </body>
    </html>
  );
}
