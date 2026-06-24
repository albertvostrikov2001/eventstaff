import type { Metadata } from 'next';
import { OfferDocument } from '@/components/legal/OfferDocument';

export const metadata: Metadata = {
  title: 'Публичная оферта для работодателей',
  description: 'Публичная оферта на оказание услуг платформы для работодателей сферы общественного питания.',
  alternates: { canonical: '/legal/offer/employers' },
};

export default function OfferEmployersPage() {
  return <OfferDocument variant="employers" />;
}
