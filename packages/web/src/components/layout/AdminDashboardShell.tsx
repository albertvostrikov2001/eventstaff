'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  FileText,
  ClipboardList,
  Mail,
  ImagePlus,
  MessageSquare,
  MessageSquareWarning,
  ScrollText,
  Inbox,
  Swords,
  MessagesSquare,
  Zap,
} from 'lucide-react';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { DashboardTopBar } from '@/components/layout/DashboardTopBar';
import { apiClient } from '@/lib/api/client';

type AdminSummary = {
  newComplaints: number;
  pendingMedia: number;
  newIndividualRequests: number;
  newContactRequests: number;
  restrictedUsers: number;
};

export function AdminDashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [counts, setCounts] = useState<AdminSummary>({
    newComplaints: 0,
    pendingMedia: 0,
    newIndividualRequests: 0,
    newContactRequests: 0,
    restrictedUsers: 0,
  });

  useEffect(() => {
    // Счётчики непрочитанного для бейджей в сайдбаре — обновляем периодически.
    const fetchSummary = () =>
      apiClient
        .get<{ data: AdminSummary }>('/admin/dashboard-summary')
        .then((r) => setCounts((prev) => ({ ...prev, ...r.data })))
        .catch(() => {});
    void fetchSummary();
    const interval = setInterval(() => void fetchSummary(), 30_000);
    const onFocus = () => void fetchSummary();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const badge = (n: number) => (n > 0 ? n : undefined);

  const sidebarItems = useMemo(
    () => [
      { href: '/admin/dashboard', label: 'Обзор', icon: LayoutDashboard },
      { href: '/admin/users', label: 'Пользователи', icon: Users },
      { href: '/admin/vacancies', label: 'Вакансии', icon: FileText },
      { href: '/admin/applications', label: 'Отклики', icon: ClipboardList },
      { href: '/admin/complaints', label: 'Жалобы', icon: MessageSquareWarning, badge: badge(counts.newComplaints) },
      { href: '/admin/shifts/disputed', label: 'Спорные смены', icon: Swords },
      { href: '/admin/email-logs', label: 'Email-логи', icon: Mail },
      {
        href: '/admin/individual-requests',
        label: 'Персональные заявки',
        icon: Inbox,
        badge: badge(counts.newIndividualRequests),
      },
      { href: '/admin/messages', label: 'Чаты с пользователями', icon: MessageSquare },
      { href: '/admin/contact-requests', label: 'Обращения с сайта', icon: MessagesSquare, badge: badge(counts.newContactRequests) },
      { href: '/admin/subscriptions', label: 'Подписки', icon: Zap },
      { href: '/admin/audit-log', label: 'Журнал', icon: ScrollText },
      { href: '/admin/media/pending', label: 'Модерация медиа', icon: ImagePlus, badge: badge(counts.pendingMedia) },
    ],
    [counts],
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
        dark
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardTopBar variant="cabinet" onMenuToggle={() => setMobileMenuOpen((v) => !v)} />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
