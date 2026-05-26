'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Building2,
  FileText,
  Users,
  Heart,
  MessageSquare,
  Search,
  Bell,
  ImagePlus,
  Zap,
  Briefcase,
  Send,
  ExternalLink,
  Settings,
  Mail,
} from 'lucide-react';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { DashboardTopBar } from '@/components/layout/DashboardTopBar';
import { useChatInboxStore } from '@/stores/chatInboxStore';
import { RestrictionBanner } from '@/components/layout/RestrictionBanner';
import {
  useEmployerFavoriteWorkerIdsQuery,
  useIsEmployerFavoritesLoaded,
} from '@/hooks/useEmployerFavoriteWorkerIds';
import { useNotificationUnreadCount } from '@/hooks/useNotificationUnreadCount';

export function EmployerDashboardShell({ children }: { children: React.ReactNode }) {
  const chatUnread = useChatInboxStore((s) => s.unreadTotal);
  const notifUnread = useNotificationUnreadCount();
  const isEmployer = useIsEmployerFavoritesLoaded();
  const { data: favIds } = useEmployerFavoriteWorkerIdsQuery(isEmployer);
  const favCount = favIds?.length ?? 0;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const sidebarItems = useMemo(
    () => [
      { href: '/employer/dashboard', label: 'Дашборд', icon: LayoutDashboard },
      { href: '/employer/profile', label: 'Профиль компании', icon: Building2 },
      { href: '/employer/vacancies', label: 'Мои вакансии', icon: FileText },
      { href: '/employer/shifts', label: 'Смены', icon: Briefcase },
      { href: '/employer/invitations', label: 'Приглашения', icon: Send },
      { href: '/employer/search', label: 'Найти персонал', icon: Search },
      {
        href: '/employer/favorites',
        label: 'Избранное',
        icon: Heart,
        badge: favCount > 0 ? favCount : undefined,
      },
      { href: '/employer/messages', label: 'Сообщения', icon: MessageSquare, badge: chatUnread },
      { href: '/employer/applications', label: 'Все отклики', icon: Users },
      { href: '/employer/subscription', label: 'Подписка', icon: Zap },
      { href: '/employer/notifications', label: 'Уведомления', icon: Bell, badge: notifUnread || undefined },
      { href: '/employer/settings', label: 'Настройки', icon: Settings },
      { href: '/employer/settings/notifications', label: 'Email-рассылка', icon: Mail },
      { href: '/employer/profile/media', label: 'Медиа', icon: ImagePlus },
    ],
    [chatUnread, favCount, notifUnread],
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
        logoHref="/employer/dashboard"
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
