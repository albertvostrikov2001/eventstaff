import { EmployerConversationPageClient } from './EmployerConversationPageClient';

export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function EmployerConversationPage() {
  return <EmployerConversationPageClient />;
}
