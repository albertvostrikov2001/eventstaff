import { ChatRoomView } from '@/components/chat/ChatRoomView';

export const dynamic = 'force-dynamic';

export default function EmployerConversationPage() {
  return (
    <ChatRoomView
      listHref="/employer/messages"
      employerBreadcrumbParent={{ label: 'Сообщения', href: '/employer/messages' }}
    />
  );
}
