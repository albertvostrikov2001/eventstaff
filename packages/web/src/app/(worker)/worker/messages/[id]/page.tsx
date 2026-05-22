import { ChatRoomView } from '@/components/chat/ChatRoomView';

export const dynamic = 'force-dynamic';

export default function WorkerConversationPage() {
  return <ChatRoomView listHref="/worker/messages" />;
}
