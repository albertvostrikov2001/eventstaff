'use client';

import { ChatListPage } from '@/components/chat/ChatListPage';

export default function WorkerMessagesPage() {
  return (
    <ChatListPage
      hrefForRoom={(roomId) => `/worker/messages/${roomId}`}
    />
  );
}
