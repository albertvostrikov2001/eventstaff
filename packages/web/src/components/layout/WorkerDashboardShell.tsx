'use client';

import { useMemo, useState } from 'react';
import {
  LayoutDashboard,
  User,
  Send,
  Heart,
  MessageSquare,
  Calendar,
  Star,
  Bell,
  ImagePlus,
  Banknote,
  Briefcase,
  Mail,
  Settings,
} from 'lucide-react';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { DashboardTopBar } from '@/components/layout/DashboardTopBar';
import { useChatInboxStore } from '@/stores/chatInboxStore';
import { useNotificationUnreadCount } from '@/hooks/useNotificationUnreadCount';
import { RestrictionBanner } from '@/components/layout/RestrictionBanner';

export function WorkerDashboardShell({ children }: { children: React.ReactNode }) {
  const chatUnread = useChatInboxStore((s) => s.unreadTotal);
  const notifUnread = useNotificationUnreadCount();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const sidebarItems = useMemo(
    () => [
      { href: '/worker/dashboard', label: 'Дашборд', icon: LayoutDashboard },
      { href: '/worker/profile', label: 'Мой профиль', icon: User },
      { href: '/worker/shifts', label: 'Мои смены', icon: Briefcase },
      { href: '/worker/invitations', label: 'Приглашения', icon: Mail },
      { href: '/worker/applications', label: 'Мои отклики', icon: Send },
      { href: '/worker/favorites', label: 'Избранное', icon: Heart },
      { href: '/worker/messages', label: 'Сообщения', icon: MessageSquare, badge: chatUnread },
      { href: '/worker/calendar', label: 'Календарь', icon: Calendar },
      { href: '/worker/reviews', label: 'Отзывы', icon: Star },
      { href: '/worker/earnings', label: 'Заработок', icon: Banknote },
      { href: '/worker/notifications', label: 'Уведомления', icon: Bell, badge: notifUnread || undefined },
      { href: '/worker/settings', label: 'Настройки', icon: Settings },
      { href: '/worker/settings/notifications', label: 'Email-рассылка', icon: Mail },
      { href: '/worker/profile/media', label: 'Медиа', icon: ImagePlus },
    ],
    [chatUnread, notifUnread],
  );
  return (
    <div className="flex min-h-screen bg-[linear-gradient(160deg,#0d1f17_0%,#122a1e_40%,#0a1810_100%)] text-gray-100">
      <DashboardSidebar
        items={sidebarItems}
        logoHref="/worker/dashboard"
        dark
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <DashboardTopBar variant="cabinet" onMenuToggle={() => setMobileMenuOpen((v) => !v)} />
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
