'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Menu, User } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { NotificationBell } from '@/components/notifications/NotificationBell';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

type TopBarVariant = 'default' | 'cabinet';

export function DashboardTopBar({
  variant = 'default',
  onMenuToggle,
}: {
  variant?: TopBarVariant;
  onMenuToggle?: () => void;
}) {
  const isCabinet = variant === 'cabinet';
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await fetch(`${API}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {});
    logout();
    router.push('/auth/login');
  };

  const displayName = user?.workerProfile
    ? `${user.workerProfile.firstName} ${user.workerProfile.lastName}`.trim() || user.email || 'Профиль'
    : user?.employerProfile
    ? user.employerProfile.companyName || user.employerProfile.contactName || user.email || 'Профиль'
    : user?.email ?? 'Профиль';

  return (
    <header
      className={
        isCabinet
          ? 'flex h-16 shrink-0 items-center justify-between border-b border-[var(--border-subtle)] bg-[rgba(8,18,14,0.6)] px-6 backdrop-blur-xl'
          : 'flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6'
      }
    >
      <div className="flex items-center gap-3 lg:hidden">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            aria-label="Открыть меню"
            className={
              isCabinet
                ? 'rounded-[var(--r-3)] p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-white/10 hover:text-[var(--text-primary)]'
                : 'rounded-full p-1.5 text-gray-500 hover:bg-gray-100'
            }
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <Link
          href="/"
          className={
            isCabinet
              ? 'font-display text-[17px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]'
              : 'font-heading text-lg font-bold text-gray-900 hover:text-gray-800'
          }
        >
          Юнити
        </Link>
      </div>
      <div className="ml-auto flex items-center gap-2">
        {isCabinet && <NotificationBell isCabinet />}
        <div
          className={`flex items-center gap-2 text-sm ${
            isCabinet ? 'text-[var(--text-secondary)]' : 'text-gray-700'
          }`}
        >
          <User
            className={`h-4 w-4 ${isCabinet ? 'text-[var(--text-muted)]' : 'text-gray-400'}`}
          />
          <span className="max-w-[150px] truncate">{displayName}</span>
        </div>
        <button
          onClick={handleLogout}
          className={
            isCabinet
              ? 'flex items-center gap-1.5 rounded-[var(--r-2)] border border-[var(--border-default)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
              : 'flex items-center gap-1.5 rounded-input border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-900'
          }
        >
          <LogOut className="h-3.5 w-3.5" />
          Выйти
        </button>
      </div>
    </header>
  );
}
