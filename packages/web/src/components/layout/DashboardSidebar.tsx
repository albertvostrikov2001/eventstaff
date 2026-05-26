'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

interface DashboardSidebarProps {
  items: SidebarItem[];
  logoHref: string;
  dark?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  footer?: ReactNode;
}

/** Geometric brand mark — matches design system */
function BrandMark() {
  return (
    <div
      className="relative h-6 w-6 shrink-0 rounded-[6px]"
      style={{ background: 'linear-gradient(135deg, var(--accent) 0%, #1f5a3d 100%)' }}
    >
      <div
        className="absolute rounded-[2px]"
        style={{ inset: '7px', background: 'var(--bg-0)' }}
      />
      <div
        className="absolute rounded-[1px]"
        style={{ inset: '10px', background: 'var(--accent)' }}
      />
    </div>
  );
}

function NavLinks({
  items,
  dark,
  onLinkClick,
}: {
  items: SidebarItem[];
  dark: boolean;
  onLinkClick?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5 p-2">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onLinkClick}
            className={cn(
              'relative flex items-center gap-2.5 rounded-[var(--r-3)] border-l-[3px] px-3 py-[9px] text-sm font-medium transition-all duration-[120ms]',
              isActive
                ? dark
                  ? 'border-[var(--accent)] bg-[var(--accent-faint)] pl-[9px] text-[var(--accent)]'
                  : 'border-primary-500 bg-primary-50 pl-[9px] text-primary-700'
                : dark
                ? 'border-transparent pl-[9px] text-[var(--text-secondary)] hover:bg-white/[0.04] hover:text-[var(--text-primary)]'
                : 'border-transparent pl-[9px] text-gray-600 hover:bg-gray-50 hover:text-primary-600',
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.badge != null && item.badge > 0 && (
              <span
                className={cn(
                  'ml-auto shrink-0 min-w-[18px] rounded-full px-1.5 py-0.5 text-center font-mono text-[10px] font-semibold leading-none tracking-[.04em]',
                  dark
                    ? 'bg-[var(--accent)] text-[var(--text-on-accent)]'
                    : 'bg-primary-500 text-white',
                )}
              >
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardSidebar({
  items,
  logoHref,
  dark = false,
  mobileOpen = false,
  onMobileClose,
  footer,
}: DashboardSidebarProps) {
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onMobileClose?.();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [mobileOpen, onMobileClose]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const brandLink = (
    <Link href={logoHref} className="flex items-center gap-2.5" onClick={onMobileClose}>
      <BrandMark />
      <span
        className={cn(
          'font-display text-[17px] font-semibold tracking-[-0.01em]',
          dark ? 'text-[var(--text-primary)]' : 'text-gray-900',
        )}
      >
        Юнити
      </span>
    </Link>
  );

  const logoRow = (withClose: boolean) => (
    <div
      className={cn(
        'flex h-16 items-center gap-2 border-b px-5',
        dark ? 'border-[var(--border-subtle)]' : 'border-gray-200',
      )}
    >
      {brandLink}
      {withClose && (
        <button
          onClick={onMobileClose}
          aria-label="Закрыть меню"
          className={cn(
            'ml-auto shrink-0 rounded-[var(--r-3)] p-1.5 transition-colors',
            dark
              ? 'text-[var(--text-secondary)] hover:bg-white/10 hover:text-[var(--text-primary)]'
              : 'text-gray-500 hover:bg-gray-100',
          )}
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );

  const footerSection = footer != null ? (
    <div
      className={cn(
        'shrink-0 border-t p-4',
        dark ? 'border-[var(--border-subtle)]' : 'border-gray-200',
      )}
    >
      {footer}
    </div>
  ) : null;

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden w-60 shrink-0 flex-col border-r lg:flex',
          dark
            ? 'border-[var(--border-subtle)] bg-black/25'
            : 'border-gray-200 bg-white',
        )}
      >
        {logoRow(false)}
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto">
            <NavLinks items={items} dark={dark} />
          </div>
          {footerSection}
        </div>
      </aside>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          aria-hidden="true"
          onClick={onMobileClose}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col transform transition-transform duration-300 ease-in-out lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          dark
            ? 'border-r border-[var(--border-subtle)] bg-[var(--bg-1)]'
            : 'border-r border-gray-200 bg-white',
        )}
        aria-label="Мобильная навигация"
      >
        {logoRow(true)}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <NavLinks items={items} dark={dark} onLinkClick={onMobileClose} />
          </div>
          {footerSection}
        </div>
      </aside>
    </>
  );
}
