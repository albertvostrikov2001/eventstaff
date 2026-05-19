'use client';

import { usePathname } from 'next/navigation';
import { ChatListPage } from '@/components/chat/ChatListPage';

export default function EmployerMessagesLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isConversation =
    pathname.startsWith('/employer/messages/') && pathname !== '/employer/messages';

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 lg:h-[calc(100vh-5.5rem)] lg:flex-row lg:gap-0">
      <aside
        className={`flex min-h-0 shrink-0 flex-col border-gray-100 lg:w-[400px] lg:border-r lg:pr-4 ${
          isConversation ? 'hidden lg:flex' : 'flex'
        }`}
      >
        <div className="flex min-h-0 flex-1 flex-col lg:overflow-y-auto">
          <ChatListPage
            hrefForRoom={(roomId) => `/employer/messages/${roomId}`}
            emptyCtaHref="/employer/search"
            emptyCtaLabel="Найти персонал"
          />
        </div>
      </aside>
      <main
        className={`min-w-0 flex-1 min-h-0 flex-col lg:pl-4 ${
          isConversation ? 'flex' : 'hidden lg:flex'
        }`}
      >
        {children}
      </main>
    </div>
  );
}
