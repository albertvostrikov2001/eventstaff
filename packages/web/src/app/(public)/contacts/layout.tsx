import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Контакты',
  description:
    'Свяжитесь с командой Юнити. Ответим на вопросы о платформе, подборе персонала и сотрудничестве.',
  alternates: { canonical: '/contacts' },
};

export default function ContactsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
