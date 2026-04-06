import { WorkerDetailPageClient } from './WorkerDetailPageClient';

export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function WorkerDetailPage() {
  return <WorkerDetailPageClient />;
}
