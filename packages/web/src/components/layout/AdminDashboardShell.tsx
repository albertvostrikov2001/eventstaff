'use client';

import {
  LayoutDashboard,
  Users,
  FileText,
  ClipboardList,
  Mail,
  ImagePlus,
  MessageSquareWarning,
  ScrollText,
  Inbox,
} from 'lucide-react';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { DashboardTopBar } from '@/components/layout/DashboardTopBar';

const SIDEBAR_ITEMS = [
  { href: '/admin/dashboard', label: 'Обзор', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Пользователи', icon: Users },
  { href: '/admin/vacancies', label: 'Вакансии', icon: FileText },
  { href: '/admin/applications', label: 'Отклики', icon: ClipboardList },
  { href: '/admin/complaints', label: 'Жалобы', icon: MessageSquareWarning },
  { href: '/admin/email-logs', label: 'Email-логи', icon: Mail },
  { href: '/admin/individual-requests', label: 'Персональные заявки', icon: Inbox },
  { href: '/admin/audit-log', label: 'Журнал', icon: ScrollText },
  { href: '/admin/media/pending', label: 'Модерация медиа', icon: ImagePlus },
];

export function AdminDashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[linear-gradient(160deg,#0d1f17_0%,#122a1e_40%,#0a1810_100%)] text-gray-100">
      <DashboardSidebar items={SIDEBAR_ITEMS} logoHref="/admin/dashboard" dark />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <DashboardTopBar variant="cabinet" />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
