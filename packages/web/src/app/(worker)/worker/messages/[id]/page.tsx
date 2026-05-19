import { ChatRoomView } from '@/components/chat/ChatRoomView';

export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function WorkerConversationPage() {
  return <ChatRoomView listHref="/worker/messages" />;
}
