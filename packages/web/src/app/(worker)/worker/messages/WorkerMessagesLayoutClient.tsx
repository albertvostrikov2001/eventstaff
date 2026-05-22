'use client';

import { usePathname } from 'next/navigation';
import { ChatListPage } from '@/components/chat/ChatListPage';

export default function WorkerMessagesLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isConversation =
    pathname.startsWith('/worker/messages/') && pathname !== '/worker/messages';

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 lg:h-[calc(100vh-5.5rem)] lg:flex-row lg:gap-0">
      <aside
        className={`flex min-h-0 shrink-0 flex-col border-white/[0.08] lg:w-[400px] lg:border-r lg:pr-4 ${
          isConversation ? 'hidden lg:flex' : 'flex'
        }`}
      >
        <div className="flex min-h-0 flex-1 flex-col lg:overflow-y-auto">
          <ChatListPage hrefForRoom={(roomId) => `/worker/messages/${roomId}`} />
        </div>
      </aside>
      <main
        className={`min-h-0 min-w-0 flex-1 flex-col lg:pl-4 ${
          isConversation ? 'flex' : 'hidden lg:flex'
        }`}
      >
        {children}
      </main>
    </div>
  );
}
