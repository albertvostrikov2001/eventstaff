'use client';

import { useRouter } from 'next/navigation';
import { LogOut, User } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

type TopBarVariant = 'default' | 'cabinet';

export function DashboardTopBar({ variant = 'default' }: { variant?: TopBarVariant }) {
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
          ? 'flex h-14 items-center justify-between border-b border-white/[0.08] bg-[#0d1f17]/95 px-6 backdrop-blur-[16px]'
          : 'flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6'
      }
    >
      <div className="lg:hidden">
        <span
          className={`font-heading text-lg font-bold ${
            isCabinet ? 'text-white' : 'text-gray-900'
          }`}
        >
          Юнити
        </span>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <div
          className={`flex items-center gap-2 text-sm ${
            isCabinet ? 'text-white/80' : 'text-gray-700'
          }`}
        >
          <User className={`h-4 w-4 ${isCabinet ? 'text-white/40' : 'text-gray-400'}`} />
          <span className="max-w-[150px] truncate">{displayName}</span>
        </div>
        <button
          onClick={handleLogout}
          className={
            isCabinet
              ? 'flex items-center gap-1.5 rounded-input border border-white/15 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-white/25 hover:text-white'
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
