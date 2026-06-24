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
  Zap,
  Briefcase,
  Send,
  ExternalLink,
  Settings,
  BarChart2,
  Copy,
} from 'lucide-react';
import { DashboardSidebar, type SidebarEntry } from '@/components/layout/DashboardSidebar';
import { DashboardTopBar } from '@/components/layout/DashboardTopBar';
import { useChatInboxStore } from '@/stores/chatInboxStore';
import { RestrictionBanner } from '@/components/layout/RestrictionBanner';
import {
  useEmployerFavoriteWorkerIdsQuery,
  useIsEmployerFavoritesLoaded,
} from '@/hooks/useEmployerFavoriteWorkerIds';
import { useNavNotifications, EMPLOYER_SECTION_TYPES } from '@/lib/notifications/useNavNotifications';

export function EmployerDashboardShell({ children }: { children: React.ReactNode }) {
  const chatUnread = useChatInboxStore((s) => s.unreadTotal);
  const isEmployer = useIsEmployerFavoritesLoaded();
  const { data: favIds } = useEmployerFavoriteWorkerIdsQuery(isEmployer);
  const favCount = favIds?.length ?? 0;
  const { sectionCounts } = useNavNotifications(EMPLOYER_SECTION_TYPES);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const sidebarItems = useMemo<SidebarEntry[]>(
    () => [
      { href: '/employer/dashboard', label: 'Дашборд', icon: LayoutDashboard },

      { type: 'divider', label: 'Вакансии и найм' },
      {
        href: '/employer/vacancies',
        label: 'Мои вакансии',
        icon: FileText,
        ctaHref: '/employer/vacancies/new',
        ctaLabel: 'Создать вакансию',
      },
      { href: '/employer/search', label: 'Найти персонал', icon: Search },
      {
        href: '/employer/favorites',
        label: 'Избранное',
        icon: Heart,
        badge: favCount > 0 ? favCount : undefined,
      },

      { type: 'divider', label: 'Работа' },
      { href: '/employer/applications', label: 'Отклики', icon: Users, badge: sectionCounts['/employer/applications'] },
      { href: '/employer/shifts', label: 'Смены', icon: Briefcase, badge: sectionCounts['/employer/shifts'] },
      { href: '/employer/invitations', label: 'Приглашения', icon: Send },

      { type: 'divider', label: 'Связь' },
      { href: '/employer/messages', label: 'Сообщения', icon: MessageSquare, badge: chatUnread },

      { type: 'divider', label: 'Кабинет' },
      { href: '/employer/profile', label: 'Профиль компании', icon: Building2 },
      { href: '/employer/analytics', label: 'Аналитика', icon: BarChart2 },
      { href: '/employer/subscription', label: 'Подписка', icon: Zap },
      { href: '/employer/templates', label: 'Шаблоны', icon: Copy },
      { href: '/employer/settings', label: 'Настройки', icon: Settings },
    ],
    [chatUnread, favCount, sectionCounts],
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
