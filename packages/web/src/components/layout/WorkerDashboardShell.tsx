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
  Zap,
  Briefcase,
  Mail,
  Settings,
  ExternalLink,
} from 'lucide-react';
import { DashboardSidebar, type SidebarEntry } from '@/components/layout/DashboardSidebar';
import { DashboardTopBar } from '@/components/layout/DashboardTopBar';
import { useChatInboxStore } from '@/stores/chatInboxStore';
import { RestrictionBanner } from '@/components/layout/RestrictionBanner';
import { useNavNotifications, WORKER_SECTION_TYPES } from '@/lib/notifications/useNavNotifications';

export function WorkerDashboardShell({ children }: { children: React.ReactNode }) {
  const chatUnread = useChatInboxStore((s) => s.unreadTotal);
  const { sectionCounts } = useNavNotifications(WORKER_SECTION_TYPES);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const sidebarItems = useMemo<SidebarEntry[]>(
    () => [
      { href: '/worker/dashboard', label: 'Дашборд', icon: LayoutDashboard },

      { type: 'divider', label: 'Работа' },
      { href: '/worker/profile', label: 'Мой профиль', icon: User },
      { href: '/worker/applications', label: 'Мои отклики', icon: Send, badge: sectionCounts['/worker/applications'] },
      { href: '/worker/invitations', label: 'Приглашения', icon: Mail, badge: sectionCounts['/worker/invitations'] },
      { href: '/worker/shifts', label: 'Мои смены', icon: Briefcase, badge: sectionCounts['/worker/shifts'] },
      { href: '/worker/calendar', label: 'Календарь', icon: Calendar },

      { type: 'divider', label: 'Связь' },
      { href: '/worker/messages', label: 'Сообщения', icon: MessageSquare, badge: chatUnread },
      { href: '/worker/favorites', label: 'Избранное', icon: Heart },

      { type: 'divider', label: 'Кабинет' },
      { href: '/worker/reviews', label: 'Отзывы', icon: Star, badge: sectionCounts['/worker/reviews'] },
      { href: '/worker/subscription', label: 'Подписка', icon: Zap },
      { href: '/worker/settings', label: 'Настройки', icon: Settings },
    ],
    [chatUnread, sectionCounts],
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
        logoHref="/"
        footer={sidebarFooter}
        dark
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
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
