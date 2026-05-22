import { ChatRoomView } from '@/components/chat/ChatRoomView';
import { PAGE_DYNAMIC, buildStaticParams } from '@/lib/static-export-routes';

export const dynamic = PAGE_DYNAMIC;

export function generateStaticParams() {
  return buildStaticParams([{ roomId: 'placeholder' }]);
}

export default function EmployerConversationPage() {
  return (
    <ChatRoomView
      listHref="/employer/messages"
      employerBreadcrumbParent={{ label: 'Сообщения', href: '/employer/messages' }}
    />
  );
}
