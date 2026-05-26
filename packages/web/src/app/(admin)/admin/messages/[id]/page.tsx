import { ChatRoomView } from '@/components/chat/ChatRoomView';

export const dynamic = 'force-dynamic';

export default function AdminConversationPage() {
  return <ChatRoomView listHref="/admin/messages" />;
}
