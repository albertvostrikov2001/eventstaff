'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
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
  Zap,
  Briefcase,
  Mail,
  Settings,
  ExternalLink,
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
      { href: '/worker/subscription', label: 'Подписка', icon: Zap },
      { href: '/worker/notifications', label: 'Уведомления', icon: Bell, badge: notifUnread || undefined },
      { href: '/worker/settings', label: 'Настройки', icon: Settings },
      { href: '/worker/settings/notifications', label: 'Email-рассылка', icon: Mail },
      { href: '/worker/profile/media', label: 'Медиа', icon: ImagePlus },
    ],
    [chatUnread, notifUnread],
  );
  const sidebarFooter = (
    <div className="space-y-2.5">
      <Link
        href="/"
        className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
        Перейти на сайт
      </Link>
      <div className="flex flex-col gap-1.5 border-t border-[var(--border-subtle)] pt-2.5 font-mono text-[11px] tracking-[.04em] uppercase">
        <Link href="/vacancies" className="text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]">Вакансии</Link>
        <Link href="/workers" className="text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]">Специалисты</Link>
        <Link href="/employers" className="text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]">Работодатели</Link>
        <Link href="/pricing" className="text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]">Тарифы</Link>
      </div>
    </div>
  );

  return (
    <div
      data-shell="dark"
      className="flex min-h-screen text-[var(--text-primary)]"
      style={{ background: 'linear-gradient(160deg, var(--bg-1) 0%, #0a1810 100%)' }}
    >
      <DashboardSidebar
        items={sidebarItems}
        logoHref="/worker/dashboard"
        footer={sidebarFooter}
        dark
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <DashboardTopBar variant="cabinet" onMenuToggle={() => setMobileMenuOpen((v) => !v)} />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-[1100px] px-4 py-8 sm:px-8">
            <RestrictionBanner />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
