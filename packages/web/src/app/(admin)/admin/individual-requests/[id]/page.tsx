import { IndividualRequestDetailPageClient } from './IndividualRequestDetailPageClient';
import { PAGE_DYNAMIC, buildStaticParams } from '@/lib/static-export-routes';

export const dynamic = PAGE_DYNAMIC;

export function generateStaticParams() {
  return buildStaticParams([{ id: '__static_export_placeholder__' }]);
}

export default function AdminIndividualRequestDetailPage() {
  return <IndividualRequestDetailPageClient />;
}
