import { IndividualRequestDetailPageClient } from './IndividualRequestDetailPageClient';

export function generateStaticParams() {
  return [{ id: '__static_export_placeholder__' }];
}

export default function AdminIndividualRequestDetailPage() {
  return <IndividualRequestDetailPageClient />;
}
