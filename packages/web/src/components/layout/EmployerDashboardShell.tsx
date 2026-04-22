'use client';

import { useMemo } from 'react';
import {
  LayoutDashboard,
  Building2,
  FileText,
  Users,
  Heart,
  MessageSquare,
  MessageCircle,
  Search,
  Bell,
  ImagePlus,
  Banknote,
} from 'lucide-react';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { DashboardTopBar } from '@/components/layout/DashboardTopBar';
import { useChatInboxStore } from '@/stores/chatInboxStore';
import { RestrictionBanner } from '@/components/layout/RestrictionBanner';

export function EmployerDashboardShell({ children }: { children: React.ReactNode }) {
  const chatUnread = useChatInboxStore((s) => s.unreadTotal);
  const sidebarItems = useMemo(
    () => [
      { href: '/employer/dashboard', label: 'Дашборд', icon: LayoutDashboard },
      { href: '/employer/profile', label: 'Профиль компании', icon: Building2 },
      { href: '/employer/vacancies', label: 'Мои вакансии', icon: FileText },
      { href: '/employer/workers', label: 'Найти персонал', icon: Search },
      { href: '/employer/favorites', label: 'Избранное', icon: Heart },
      { href: '/dashboard/chat', label: 'Чат', icon: MessageCircle, badge: chatUnread },
      { href: '/employer/messages', label: 'Сообщения', icon: MessageSquare },
      { href: '/employer/applications', label: 'Все отклики', icon: Users },
      { href: '/employer/payments', label: 'Оплата', icon: Banknote },
      { href: '/dashboard/settings/notifications', label: 'Уведомления', icon: Bell },
      { href: '/dashboard/company/media', label: 'Медиа', icon: ImagePlus },
    ],
    [chatUnread],
  );
  return (
    <div className="flex min-h-screen bg-[linear-gradient(160deg,#0d1f17_0%,#122a1e_40%,#0a1810_100%)] text-gray-100">
      <DashboardSidebar items={sidebarItems} logoHref="/employer/dashboard" dark />
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
