import { EmployerDetailPageClient } from './EmployerDetailPageClient';

export function generateStaticParams() {
  return [{ slug: 'placeholder' }];
}

export default function EmployerDetailPage() {
  return <EmployerDetailPageClient />;
}
