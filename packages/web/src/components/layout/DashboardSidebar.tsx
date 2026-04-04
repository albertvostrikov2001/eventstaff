'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';

interface SidebarItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface DashboardSidebarProps {
  items: SidebarItem[];
  logoHref: string;
  dark?: boolean;
}

export function DashboardSidebar({ items, logoHref, dark = false }: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`hidden w-64 shrink-0 border-r lg:block ${
        dark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'
      }`}
    >
      <div
        className={`flex h-16 items-center gap-2 border-b px-6 ${
          dark ? 'border-gray-700' : 'border-gray-200'
        }`}
      >
        <Link href={logoHref} className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500">
            <span className="text-sm font-bold text-white">U</span>
          </div>
          <span className={`font-heading text-lg font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>
            Юнити
          </span>
        </Link>
      </div>
      <nav className="space-y-1 p-4">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-input px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? dark
                    ? 'bg-gray-800 text-white'
                    : 'bg-primary-50 text-primary-700'
                  : dark
                  ? 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-primary-600'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
