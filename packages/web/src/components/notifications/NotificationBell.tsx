'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';

const POLL_INTERVAL_MS = 30_000;

export function NotificationBell({ isCabinet = true }: { isCabinet?: boolean }) {
  const user = useAuthStore((s) => s.user);
  const [count, setCount] = useState(0);

  const notifUrl = user?.workerProfile
    ? '/worker/notifications'
    : user?.employerProfile
      ? '/employer/notifications'
      : '/';

  const fetchCount = useCallback(async () => {
    try {
      const res = await apiClient.get<{ data: { count: number } }>(
        '/notifications/unread-count',
      );
      setCount(res.data?.count ?? 0);
    } catch {
      // silent — not critical
    }
  }, []);

  useEffect(() => {
    void fetchCount();

    const interval = setInterval(() => void fetchCount(), POLL_INTERVAL_MS);
    const onFocus = () => void fetchCount();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchCount]);

  return (
    <Link
      href={notifUrl}
      aria-label={
        count > 0 ? `Уведомления: ${count} непрочитанных` : 'Уведомления'
      }
      className={cn(
        'relative flex h-8 w-8 items-center justify-center rounded-[var(--r-3)] transition-colors',
        isCabinet
          ? 'text-[var(--text-secondary)] hover:bg-white/10 hover:text-[var(--text-primary)]'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700',
      )}
    >
      <Bell className="h-[18px] w-[18px]" />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute -right-0.5 -top-0.5 flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold leading-none text-black"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
