'use client';

import {
  LayoutDashboard,
  Building2,
  FileText,
  Users,
  Heart,
  MessageSquare,
  Search,
} from 'lucide-react';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { DashboardTopBar } from '@/components/layout/DashboardTopBar';

const SIDEBAR_ITEMS = [
  { href: '/employer/dashboard', label: 'Дашборд', icon: LayoutDashboard },
  { href: '/employer/profile', label: 'Профиль компании', icon: Building2 },
  { href: '/employer/vacancies', label: 'Мои вакансии', icon: FileText },
  { href: '/employer/workers', label: 'Найти персонал', icon: Search },
  { href: '/employer/favorites', label: 'Избранное', icon: Heart },
  { href: '/employer/messages', label: 'Сообщения', icon: MessageSquare },
  { href: '/employer/applications', label: 'Все отклики', icon: Users },
];

export default function EmployerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <DashboardSidebar items={SIDEBAR_ITEMS} logoHref="/employer/dashboard" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardTopBar />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
