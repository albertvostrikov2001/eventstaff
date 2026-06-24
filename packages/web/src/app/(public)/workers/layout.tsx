import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Специалисты',
  description:
    'Каталог проверенных event-специалистов: официанты, бармены, повара, хостес и другой персонал для мероприятий. Рейтинги, опыт, ставки.',
  alternates: { canonical: '/workers' },
  openGraph: {
    title: 'Специалисты — Юнити',
    description: 'Найдите проверенного event-специалиста для вашего мероприятия.',
    url: '/workers',
    type: 'website',
  },
};

export default function WorkersLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
