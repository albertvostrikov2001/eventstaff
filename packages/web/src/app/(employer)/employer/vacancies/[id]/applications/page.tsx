import { VacancyApplicationsPageClient } from './VacancyApplicationsPageClient';

export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function VacancyApplicationsPage() {
  return <VacancyApplicationsPageClient />;
}
