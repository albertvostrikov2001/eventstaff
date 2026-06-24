'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Bell, CheckCheck } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import { formatChatTime } from '@/components/chat/chat-format';

const POLL_INTERVAL_MS = 30_000;

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  isRead: boolean;
  createdAt: string;
  data?: Record<string, unknown> | null;
};

/** Куда вести по клику на уведомление (роле-зависимо). */
function resolveLink(isAdmin: boolean, role: string | undefined, n: Notif): string {
  const d = n.data ?? {};
  if (isAdmin) {
    if (typeof d.contactRequestId === 'string') return '/admin/contact-requests';
    if (typeof d.requestId === 'string' || n.type === 'INDIVIDUAL_REQUEST') return '/admin/individual-requests';
    if (typeof d.complaintId === 'string' || n.type === 'COMPLAINT_UPDATE') return '/admin/complaints';
    return '/admin/individual-requests';
  }
  const base = role === 'employer' ? '/employer' : '/worker';
  if (n.type.includes('CHAT') || n.type.includes('MESSAGE')) return `${base}/messages`;
  if (n.type === 'INVITATION') return `${base}/invitations`;
  if (n.type.includes('APPLICATION')) return role === 'employer' ? '/employer/applications' : '/worker/applications';
  if (n.type.includes('SHIFT')) return `${base}/shifts`;
  if (n.type.includes('REVIEW')) return '/worker/reviews';
  if (n.type.includes('PAYMENT')) return `${base}/shifts`;
  return `${base}/notifications`;
}

export function NotificationBell({ isCabinet = true }: { isCabinet?: boolean }) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const pathname = usePathname();
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(false);

  const isAdmin = Boolean(pathname?.startsWith('/admin') || user?.activeRole === 'admin');
  const allHref = isAdmin
    ? '/admin/individual-requests'
    : user?.workerProfile
      ? '/worker/notifications'
      : user?.employerProfile
        ? '/employer/notifications'
        : '/';

  const fetchCount = useCallback(async () => {
    try {
      const res = await apiClient.get<{ data: { count: number } }>('/notifications/unread-count');
      setCount(res.data?.count ?? 0);
    } catch {
      // silent
    }
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ data: Notif[] }>('/notifications', { page: 1, limit: 8 });
      setItems(res.data ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
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

  const openItem = async (n: Notif) => {
    const link = resolveLink(isAdmin, user?.activeRole, n);
    if (!n.isRead) {
      try {
        await apiClient.patch(`/notifications/${n.id}/read`, {});
        setCount((c) => Math.max(0, c - 1));
        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      } catch {
        // ignore
      }
    }
    router.push(link);
  };

  const markAll = async () => {
    try {
      await apiClient.post('/notifications/read-all', {});
      setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
      setCount(0);
    } catch {
      // ignore
    }
  };

  return (
    <DropdownMenu.Root onOpenChange={(open) => { if (open) void fetchList(); }}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={count > 0 ? `Уведомления: ${count} непрочитанных` : 'Уведомления'}
          className={cn(
            'relative flex h-8 w-8 items-center justify-center rounded-[var(--r-3)] transition-colors outline-none',
            isCabinet
              ? 'text-[var(--text-secondary)] hover:bg-white/10 hover:text-[var(--text-primary)] data-[state=open]:bg-white/10'
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
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="z-[120] w-[360px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[14px] border border-white/10 bg-[#111f18] shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
            <span className="text-sm font-semibold text-white">Уведомления</span>
            {count > 0 && (
              <button
                type="button"
                onClick={() => void markAll()}
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-300 hover:text-emerald-200"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Прочитать все
              </button>
            )}
          </div>

          <div className="max-h-[min(60vh,420px)] overflow-y-auto py-1">
            {loading ? (
              <div className="space-y-2 p-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-[10px] bg-white/[0.05]" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <Bell className="h-7 w-7 text-white/30" />
                <p className="text-sm text-white/50">Нет уведомлений</p>
              </div>
            ) : (
              items.map((n) => (
                <DropdownMenu.Item
                  key={n.id}
                  onSelect={(e) => {
                    e.preventDefault();
                    void openItem(n);
                  }}
                  className={cn(
                    'flex cursor-pointer items-start gap-2.5 px-4 py-2.5 outline-none transition hover:bg-white/[0.06] focus:bg-white/[0.06]',
                    !n.isRead && 'bg-emerald-500/[0.06]',
                  )}
                >
                  <span
                    className={cn(
                      'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                      n.isRead ? 'bg-transparent' : 'bg-emerald-400',
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('truncate text-sm', n.isRead ? 'text-white/70' : 'font-medium text-white')}>
                        {n.title}
                      </p>
                      <span className="shrink-0 text-[11px] text-white/35">{formatChatTime(n.createdAt)}</span>
                    </div>
                    {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-white/50">{n.body}</p>}
                  </div>
                </DropdownMenu.Item>
              ))
            )}
          </div>

          <DropdownMenu.Item asChild>
            <Link
              href={allHref}
              className="block border-t border-white/[0.08] px-4 py-2.5 text-center text-xs font-medium text-emerald-300 outline-none transition hover:bg-white/[0.06] hover:text-emerald-200"
            >
              Все уведомления
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
