'use client';

import { useMemo } from 'react';
import {
  LayoutDashboard,
  User,
  Send,
  Heart,
  MessageSquare,
  MessageCircle,
  Calendar,
  Star,
  Bell,
  ImagePlus,
  Banknote,
} from 'lucide-react';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { DashboardTopBar } from '@/components/layout/DashboardTopBar';
import { useChatInboxStore } from '@/stores/chatInboxStore';
import { RestrictionBanner } from '@/components/layout/RestrictionBanner';

export function WorkerDashboardShell({ children }: { children: React.ReactNode }) {
  const chatUnread = useChatInboxStore((s) => s.unreadTotal);
  const sidebarItems = useMemo(
    () => [
      { href: '/worker/dashboard', label: 'Дашборд', icon: LayoutDashboard },
      { href: '/worker/profile', label: 'Мой профиль', icon: User },
      { href: '/worker/applications', label: 'Мои отклики', icon: Send },
      { href: '/worker/favorites', label: 'Избранное', icon: Heart },
      { href: '/dashboard/chat', label: 'Чат', icon: MessageCircle, badge: chatUnread },
      { href: '/worker/messages', label: 'Сообщения', icon: MessageSquare },
      { href: '/worker/calendar', label: 'Календарь', icon: Calendar },
      { href: '/worker/reviews', label: 'Отзывы', icon: Star },
      { href: '/worker/earnings', label: 'Заработок', icon: Banknote },
      { href: '/dashboard/settings/notifications', label: 'Уведомления', icon: Bell },
      { href: '/dashboard/profile/media', label: 'Медиа', icon: ImagePlus },
    ],
    [chatUnread],
  );
  return (
    <div className="flex min-h-screen bg-[linear-gradient(160deg,#0d1f17_0%,#122a1e_40%,#0a1810_100%)] text-gray-100">
      <DashboardSidebar items={sidebarItems} logoHref="/worker/dashboard" dark />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <DashboardTopBar variant="cabinet" />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
            <RestrictionBanner />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
