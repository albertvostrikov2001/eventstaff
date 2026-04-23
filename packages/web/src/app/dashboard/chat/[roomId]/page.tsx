import { ChatRoomView } from '@/components/chat/ChatRoomView';

/** Статический экспорт (GitHub Pages): одна заглушка — реальные roomId только на клиенте. */
export function generateStaticParams() {
  return [{ roomId: '__static_export_placeholder__' }];
}

export default function ChatRoomPage() {
  return <ChatRoomView />;
}
