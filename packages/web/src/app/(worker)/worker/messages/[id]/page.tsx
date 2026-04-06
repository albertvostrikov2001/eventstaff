import { WorkerConversationPageClient } from './WorkerConversationPageClient';

export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function WorkerConversationPage() {
  return <WorkerConversationPageClient />;
}
