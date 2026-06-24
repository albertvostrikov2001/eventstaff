'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { LogOut, Menu, User, Settings, ChevronDown, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { publicAssetUrl } from '@/lib/public-asset-url';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import type { AuthUser } from '@/stores/authStore';

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
  const { user, logout, setUser } = useAuthStore();
  const { toast } = useToast();

  const handleLogout = async () => {
    await fetch(`${API}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {});
    logout();
    router.push('/auth/login');
  };

  const otherRole: 'worker' | 'employer' | null =
    user && user.roles && user.roles.length > 1
      ? user.activeRole === 'employer'
        ? 'worker'
        : 'employer'
      : null;

  const handleSwitchRole = async () => {
    if (!otherRole) return;
    try {
      const res = await apiClient.patch<{ data: { user: AuthUser } }>('/auth/active-role', {
        role: otherRole,
      });
      setUser(res.data.user);
      router.push(otherRole === 'employer' ? '/employer/dashboard' : '/worker/dashboard');
    } catch {
      toast('Не удалось переключить роль', 'error');
    }
  };

  const displayName = user?.workerProfile
    ? `${user.workerProfile.firstName} ${user.workerProfile.lastName}`.trim() || user.email || 'Профиль'
    : user?.employerProfile
    ? user.employerProfile.companyName || user.employerProfile.contactName || user.email || 'Профиль'
    : user?.email ?? 'Профиль';

  const role = user?.activeRole ?? (user?.employerProfile ? 'employer' : 'worker');
  const base = role === 'employer' ? '/employer' : '/worker';
  const profileHref = `${base}/profile`;
  const settingsHref = `${base}/settings`;

  return (
    <header
      className={
        isCabinet
          ? 'flex h-16 shrink-0 items-center justify-between border-b border-[var(--border-subtle)] bg-[rgba(8,18,14,0.6)] px-3 sm:px-6 backdrop-blur-xl'
          : 'flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-3 sm:px-6'
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
          className="flex items-center gap-2"
          aria-label="Юнити — главная"
        >
          <Image
            src={publicAssetUrl('/logo.png')}
            alt="Юнити"
            width={26}
            height={28}
            className="block shrink-0"
            style={{ width: 26, height: 28, objectFit: 'contain' }}
            priority
          />
          <span
            className={
              isCabinet
                ? 'font-display text-[17px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]'
                : 'font-heading text-lg font-bold text-gray-900 hover:text-gray-800'
            }
          >
            Юнити
          </span>
        </Link>
      </div>
      <div className="ml-auto flex items-center gap-2">
        {isCabinet && <NotificationBell isCabinet />}
        {isCabinet ? (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                className="flex items-center gap-2 rounded-[var(--r-3)] border border-[var(--border-default)] bg-white/[0.03] px-3 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-white/[0.07] hover:text-[var(--text-primary)] focus:outline-none data-[state=open]:bg-white/[0.07]"
                aria-label="Меню пользователя"
              >
                <User className="h-4 w-4 text-[var(--text-muted)]" />
                <span className="max-w-[90px] truncate sm:max-w-[150px]">{displayName}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={6}
                className="z-[120] min-w-[200px] rounded-[14px] border border-white/10 bg-[#111f18] py-2 shadow-xl"
              >
                <div className="border-b border-white/[0.06] px-4 pb-2 pt-1">
                  <p className="truncate text-sm font-medium text-white">{displayName}</p>
                  {user?.email && (
                    <p className="truncate text-xs text-white/45">{user.email}</p>
                  )}
                </div>
                <DropdownMenu.Item asChild>
                  <Link
                    href={profileHref}
                    className="flex cursor-pointer items-center gap-2.5 px-4 py-2.5 text-sm text-white outline-none transition hover:bg-white/[0.06]"
                  >
                    <User className="h-4 w-4 text-white/50" />
                    Мой профиль
                  </Link>
                </DropdownMenu.Item>
                <DropdownMenu.Item asChild>
                  <Link
                    href={settingsHref}
                    className="flex cursor-pointer items-center gap-2.5 px-4 py-2.5 text-sm text-white outline-none transition hover:bg-white/[0.06]"
                  >
                    <Settings className="h-4 w-4 text-white/50" />
                    Настройки
                  </Link>
                </DropdownMenu.Item>
                {otherRole && (
                  <>
                    <DropdownMenu.Separator className="my-1 h-px bg-white/[0.08]" />
                    <DropdownMenu.Item
                      onSelect={() => void handleSwitchRole()}
                      className="flex cursor-pointer items-center gap-2.5 px-4 py-2.5 text-sm text-white outline-none transition hover:bg-white/[0.06]"
                    >
                      <RefreshCw className="h-4 w-4 text-white/50" />
                      {otherRole === 'employer' ? 'В кабинет работодателя' : 'В кабинет специалиста'}
                    </DropdownMenu.Item>
                  </>
                )}
                <DropdownMenu.Separator className="my-1 h-px bg-white/[0.08]" />
                <DropdownMenu.Item
                  onSelect={() => void handleLogout()}
                  className="flex cursor-pointer items-center gap-2.5 px-4 py-2.5 text-sm text-red-300 outline-none transition hover:bg-white/[0.06]"
                >
                  <LogOut className="h-4 w-4" />
                  Выйти
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <User className="hidden h-4 w-4 text-gray-400 sm:block" />
              <span className="max-w-[90px] truncate sm:max-w-[150px]">{displayName}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-input border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-900"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Выйти</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
