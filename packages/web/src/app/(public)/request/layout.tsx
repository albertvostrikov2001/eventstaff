import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Персональный подбор персонала',
  description:
    'Оставьте заявку на подбор event-персонала — менеджер Юнити свяжется с вами в течение 24 часов и предложит подходящих кандидатов.',
  alternates: { canonical: '/request' },
};

export default function RequestLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
