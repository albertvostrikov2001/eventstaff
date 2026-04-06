'use client';

import {
  LayoutDashboard,
  User,
  Send,
  Heart,
  MessageSquare,
  Calendar,
  Star,
} from 'lucide-react';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { DashboardTopBar } from '@/components/layout/DashboardTopBar';

const SIDEBAR_ITEMS = [
  { href: '/worker/dashboard', label: 'Дашборд', icon: LayoutDashboard },
  { href: '/worker/profile', label: 'Мой профиль', icon: User },
  { href: '/worker/applications', label: 'Мои отклики', icon: Send },
  { href: '/worker/favorites', label: 'Избранное', icon: Heart },
  { href: '/worker/messages', label: 'Сообщения', icon: MessageSquare },
  { href: '/worker/calendar', label: 'Календарь', icon: Calendar },
  { href: '/worker/reviews', label: 'Отзывы', icon: Star },
];

export function WorkerDashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <DashboardSidebar items={SIDEBAR_ITEMS} logoHref="/worker/dashboard" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardTopBar />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
