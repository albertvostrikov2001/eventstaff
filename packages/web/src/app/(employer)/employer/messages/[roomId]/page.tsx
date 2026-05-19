import { ChatRoomView } from '@/components/chat/ChatRoomView';

export function generateStaticParams() {
  return [{ roomId: 'placeholder' }];
}

export default function EmployerConversationPage() {
  return <ChatRoomView listHref="/employer/messages" />;
}
