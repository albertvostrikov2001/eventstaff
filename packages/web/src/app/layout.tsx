import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import '@/styles/globals.css';
import { AuthProvider } from '@/providers/AuthProvider';
import { ToastProvider } from '@/components/ui/toast-context';

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'http://localhost:3000';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-playfair',
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Юнити — Биржа event-персонала',
    template: '%s | Юнити',
  },
  description:
    'Специализированная биржа труда для event-персонала в ресторанном бизнесе и сфере гостеприимства. Быстро. Проверено. Профессионально.',
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
    <html lang="ru" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen bg-white font-sans text-gray-900 antialiased">
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
