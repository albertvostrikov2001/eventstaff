import type { Metadata } from 'next';
import { ConsentDocument } from '@/components/legal/ConsentDocument';

export const metadata: Metadata = {
  title: 'Согласие на обработку персональных данных — работодатели',
  description: 'Согласие на распространение персональных данных представителя работодателя в соответствии с ФЗ-152.',
  alternates: { canonical: '/legal/consent/employers' },
};

export default function ConsentEmployersPage() {
  return <ConsentDocument variant="employers" />;
}
