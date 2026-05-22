'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Bell,
  MessageSquare,
  Star,
  RefreshCw,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { formatChatTime } from '@/components/chat/chat-format';

export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  isRead: boolean;
  createdAt: string;
  data?: Record<string, unknown> | null;
};

function NotificationIcon({ type }: { type: string }) {
  if (type.includes('MESSAGE') || type.includes('CHAT')) {
    return <MessageSquare className="h-5 w-5 text-emerald-400" />;
  }
  if (type.includes('REVIEW') || type.includes('STAR')) {
    return <Star className="h-5 w-5 text-amber-400" />;
  }
  if (type.includes('ALERT') || type.includes('COMPLAINT')) {
    return <AlertCircle className="h-5 w-5 text-red-400" />;
  }
  return <Bell className="h-5 w-5 text-emerald-400" />;
}

function resolveLink(data?: Record<string, unknown> | null): string | null {
  if (!data) return null;
  if (typeof data.link === 'string') return data.link;
  if (typeof data.entityType === 'string' && typeof data.entityId === 'string') {
    const t = data.entityType.toLowerCase();
    if (t === 'vacancy') return `/vacancies/${data.entityId}`;
    if (t === 'application') return `/employer/applications`;
    if (t === 'shift') return `/worker/shifts`;
    if (t === 'complaint') return `/admin/complaints`;
  }
  if (typeof data.complaintId === 'string') return `/admin/complaints`;
  if (typeof data.shiftId === 'string') return `/worker/shifts`;
  return null;
}

function NotificationItem({
  item,
  onRead,
}: {
  item: NotificationRow;
  onRead: (id: string, link: string | null) => void;
}) {
  const link = resolveLink(item.data ?? null);
  return (
    <button
      type="button"
      onClick={() => onRead(item.id, link)}
      className={`flex w-full gap-3 rounded-[12px] border border-white/[0.08] px-4 py-3 text-left transition hover:bg-white/[0.06] ${
        item.isRead ? 'bg-white/[0.02]' : 'bg-white/[0.04]'
      }`}
    >
      <div className="relative mt-0.5 shrink-0">
        <NotificationIcon type={item.type} />
        {!item.isRead ? (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-500" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-white/90">{item.title}</p>
          <span className="shrink-0 text-xs text-white/40">{formatChatTime(item.createdAt)}</span>
        </div>
        {item.body ? (
          <p className="mt-0.5 line-clamp-2 text-sm text-white/55">{item.body}</p>
        ) : null}
      </div>
    </button>
  );
}

export function NotificationsInboxPage({ rolePrefix }: { rolePrefix: 'worker' | 'employer' }) {
  const router = useRouter();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    return apiClient
      .get<{ data: NotificationRow[]; meta?: { totalPages?: number } }>('/notifications', {
        page,
        limit: 20,
      })
      .then((res) => {
        setItems(res.data);
        setTotalPages(res.meta?.totalPages ?? 1);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasUnread = items.some((i) => !i.isRead);

  const markRead = async (id: string, link: string | null) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`, {});
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      if (link) router.push(link.startsWith('/') ? link : `/${rolePrefix}${link}`);
    } catch {
      /* ignore */
    }
  };

  const markAll = async () => {
    setMarkingAll(true);
    try {
      await apiClient.post('/notifications/read-all', {});
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white/90">Уведомления</h1>
          <p className="mt-1 text-sm text-white/50">События по вашим сменам, откликам и сообщениям</p>
        </div>
        {hasUnread ? (
          <Button type="button" variant="outline" size="sm" disabled={markingAll} onClick={() => void markAll()}>
            Прочитать все
          </Button>
        ) : null}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-[12px] bg-white/[0.06]" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-[12px] border border-white/10 bg-white/[0.04] py-12 text-center">
          <AlertCircle className="h-8 w-8 text-white/40" />
          <p className="text-sm text-white/60">Не удалось загрузить уведомления</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Повторить
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[12px] border border-white/10 bg-white/[0.04] py-16 text-center">
          <Bell className="h-10 w-10 text-white/40" />
          <p className="text-white/50">Нет уведомлений</p>
          <Link href={`/${rolePrefix}/dashboard`} className="text-sm text-emerald-400 hover:underline">
            На дашборд
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {items.map((item) => (
              <NotificationItem key={item.id} item={item} onRead={markRead} />
            ))}
          </div>
          {totalPages > 1 ? (
            <div className="mt-6 flex justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Назад
              </Button>
              <span className="flex items-center text-sm text-white/50">
                {page} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Далее
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
