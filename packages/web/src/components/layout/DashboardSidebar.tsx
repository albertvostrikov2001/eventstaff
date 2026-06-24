'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { publicAssetUrl } from '@/lib/public-asset-url';

export interface SidebarItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  /** Optional inline action button rendered at the right of the row (e.g. "+" to create). */
  ctaHref?: string;
  ctaLabel?: string;
}

export interface SidebarDivider {
  type: 'divider';
  /** Optional section heading shown above the group. */
  label?: string;
}

export type SidebarEntry = SidebarItem | SidebarDivider;

function isDivider(entry: SidebarEntry): entry is SidebarDivider {
  return 'type' in entry && entry.type === 'divider';
}

interface DashboardSidebarProps {
  items: SidebarEntry[];
  logoHref: string;
  dark?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  footer?: ReactNode;
}

function BrandMark() {
  return (
    <Image
      src={publicAssetUrl('/logo.png')}
      alt="Юнити"
      width={26}
      height={28}
      className="block shrink-0"
      style={{ width: 26, height: 28, objectFit: 'contain' }}
      priority
    />
  );
}

function NavLinks({
  items,
  dark,
  onLinkClick,
}: {
  items: SidebarEntry[];
  dark: boolean;
  onLinkClick?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5 p-2">
      {items.map((entry, idx) => {
        if (isDivider(entry)) {
          return (
            <div key={`divider-${idx}`} className={cn('px-3', entry.label ? 'mb-1 mt-3' : 'my-2')}>
              {entry.label ? (
                <span
                  className={cn(
                    'block text-[10px] font-semibold uppercase tracking-[0.08em]',
                    dark ? 'text-white/30' : 'text-gray-400',
                  )}
                >
                  {entry.label}
                </span>
              ) : (
                <div className={cn('h-px', dark ? 'bg-white/[0.06]' : 'bg-gray-200')} />
              )}
            </div>
          );
        }

        const item = entry;
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        const hasBadge = item.badge != null && item.badge > 0;
        return (
          <div key={item.href} className="relative flex items-center">
            <Link
              href={item.href}
              onClick={onLinkClick}
              className={cn(
                'relative flex flex-1 items-center gap-2.5 rounded-[var(--r-3)] border-l-[3px] px-3 py-3 lg:py-[9px] text-sm font-medium transition-all duration-[120ms]',
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
              {hasBadge && (
                <span
                  className={cn(
                    'ml-auto shrink-0 min-w-[18px] rounded-full px-1.5 py-0.5 text-center font-mono text-[10px] font-semibold leading-none tracking-[.04em]',
                    dark
                      ? 'bg-[var(--accent)] text-[var(--text-on-accent)]'
                      : 'bg-primary-500 text-white',
                  )}
                >
                  {item.badge! > 99 ? '99+' : item.badge}
                </span>
              )}
            </Link>
            {item.ctaHref && (
              <Link
                href={item.ctaHref}
                onClick={onLinkClick}
                aria-label={item.ctaLabel ?? 'Создать'}
                title={item.ctaLabel ?? 'Создать'}
                className={cn(
                  'absolute right-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-lg font-bold leading-none transition',
                  dark
                    ? 'bg-[var(--accent-faint)] text-[var(--accent)] hover:bg-[var(--accent)]/30'
                    : 'bg-primary-50 text-primary-600 hover:bg-primary-100',
                )}
              >
                +
              </Link>
            )}
          </div>
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
