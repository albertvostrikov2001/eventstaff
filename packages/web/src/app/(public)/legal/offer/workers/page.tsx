import type { Metadata } from 'next';
import { OfferDocument } from '@/components/legal/OfferDocument';

export const metadata: Metadata = {
  title: 'Публичная оферта для соискателей',
  description: 'Публичная оферта на оказание услуг платформы для соискателей сферы общественного питания.',
  alternates: { canonical: '/legal/offer/workers' },
};

export default function OfferWorkersPage() {
  return <OfferDocument variant="workers" />;
}
