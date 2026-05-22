import { VacancyApplicationsPageClient } from './VacancyApplicationsPageClient';
import { PAGE_DYNAMIC, buildStaticParams } from '@/lib/static-export-routes';

export const dynamic = PAGE_DYNAMIC;

export function generateStaticParams() {
  return buildStaticParams([{ id: 'placeholder' }]);
}

export default function VacancyApplicationsPage() {
  return <VacancyApplicationsPageClient />;
}
