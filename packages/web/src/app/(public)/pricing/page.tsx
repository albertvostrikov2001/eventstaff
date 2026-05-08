import type { Metadata } from 'next';
import PricingClient from './PricingClient';

export const metadata: Metadata = {
  title: 'Тарифы',
  description: 'Тарифные планы платформы Юнити для работодателей и специалистов',
};

export default function PricingPage() {
  return <PricingClient />;
}
