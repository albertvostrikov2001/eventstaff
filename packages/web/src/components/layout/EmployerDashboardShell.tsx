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
  Banknote,
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
      { href: '/employer/payments', label: 'Оплата', icon: Banknote },
      { href: '/employer/notifications', label: 'Уведомления', icon: Bell, badge: notifUnread || undefined },
      { href: '/employer/settings', label: 'Настройки', icon: Settings },
      { href: '/employer/settings/notifications', label: 'Email-рассылка', icon: Mail },
      { href: '/employer/profile/media', label: 'Медиа', icon: ImagePlus },
    ],
    [chatUnread, favCount, notifUnread],
  );

  const sidebarFooter = (
    <div className="space-y-3">
      <Link
        href="/"
        className="flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-[color:var(--u-emerald-light,#6ee7b7)]"
      >
        <ExternalLink className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
        Перейти на сайт
      </Link>
      <div className="flex flex-col gap-2 border-t border-white/[0.08] pt-3 text-xs">
        <Link href="/vacancies" className="text-white/45 transition hover:text-emerald-200">
          Вакансии
        </Link>
        <Link href="/workers" className="text-white/45 transition hover:text-emerald-200">
          Специалисты
        </Link>
        <Link href="/pricing" className="text-white/45 transition hover:text-emerald-200">
          Тарифы
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[linear-gradient(160deg,#0d1f17_0%,#122a1e_40%,#0a1810_100%)] text-gray-100">
      <DashboardSidebar
        items={sidebarItems}
        logoHref="/"
        footer={sidebarFooter}
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
