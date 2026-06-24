import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Работодатели',
  description:
    'Каталог работодателей платформы Юнити: рестораны, банкетные залы, кейтеринговые компании. Проверенные заведения, реальные отзывы и вакансии.',
  alternates: { canonical: '/employers' },
  openGraph: {
    title: 'Работодатели — Юнити',
    description: 'Лучшие заведения и кейтеринговые компании, ищущие event-персонал.',
    url: '/employers',
    type: 'website',
  },
};

export default function EmployersLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
