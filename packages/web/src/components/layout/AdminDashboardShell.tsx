'use client';

import {
  LayoutDashboard,
  Users,
  FileText,
  ClipboardList,
} from 'lucide-react';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { DashboardTopBar } from '@/components/layout/DashboardTopBar';

const SIDEBAR_ITEMS = [
  { href: '/admin/dashboard', label: 'Обзор', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Пользователи', icon: Users },
  { href: '/admin/vacancies', label: 'Вакансии', icon: FileText },
  { href: '/admin/applications', label: 'Отклики', icon: ClipboardList },
];

export function AdminDashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <DashboardSidebar items={SIDEBAR_ITEMS} logoHref="/admin/dashboard" dark />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardTopBar />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
