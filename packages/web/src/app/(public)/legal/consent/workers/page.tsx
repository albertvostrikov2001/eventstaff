import type { Metadata } from 'next';
import { ConsentDocument } from '@/components/legal/ConsentDocument';

export const metadata: Metadata = {
  title: 'Согласие на обработку персональных данных — соискатели',
  description: 'Согласие на распространение персональных данных соискателя в соответствии с ФЗ-152.',
  alternates: { canonical: '/legal/consent/workers' },
};

export default function ConsentWorkersPage() {
  return <ConsentDocument variant="workers" />;
}
