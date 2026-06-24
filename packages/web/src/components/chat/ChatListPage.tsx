'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Search, MessageSquare, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useChatSocket, MAX_ATTEMPTS } from '@/components/chat/ChatInboxProvider';
import { apiClient } from '@/lib/api/client';
import { formatChatTime } from '@/components/chat/chat-format';
import { resolveMediaUrl } from '@/lib/media/url';
import { useChatInboxStore } from '@/stores/chatInboxStore';

type RoomRow = {
  id: string;
  createdAt: string;
  lastMessageAt: string;
  peer: {
    displayName: string;
    role: 'worker' | 'employer';
    avatarUrl: string | null;
    verified?: boolean;
  };
  lastMessage: {
    id: string;
    text: string | null;
    createdAt: string;
    isSystem: boolean;
    senderId: string;
    type: string;
  } | null;
  unreadCount: number;
  contextSubtitle?: string | null;
};

export type ChatListPageProps = {
  /** Ссылка на комнату */
  hrefForRoom: (roomId: string) => string;
  emptyCtaHref?: string;
  emptyCtaLabel?: string;
  /** Явный id активной комнаты (split desktop). Если не задан — из pathname. */
  activeRoomId?: string | null;
};

export function ChatListPage({
  hrefForRoom,
  emptyCtaHref,
  emptyCtaLabel,
  activeRoomId: activeRoomIdProp,
}: ChatListPageProps) {
  const pathname = usePathname();
  const activeRoomIdFromPath = useMemo(() => {
    const parts = pathname.split('/').filter(Boolean);
    const messagesIdx = parts.indexOf('messages');
    if (messagesIdx >= 0 && parts[messagesIdx + 1]) return parts[messagesIdx + 1];
    return null;
  }, [pathname]);
  const activeRoomId = activeRoomIdProp ?? activeRoomIdFromPath;
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const connection = useChatInboxStore((s) => s.connection);
  const reconnectAttempt = useChatInboxStore((s) => s.reconnectAttempt);
  const socket = useChatSocket();

  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(() => {
    const q = debouncedSearch.trim();
    const params = q ? { search: q } : undefined;
    return apiClient
      .get<{ data: { rooms: RoomRow[] } }>('/chat/rooms', params)
      .then((r) => setRooms(r.data.rooms))
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      });
  }, [debouncedSearch]);

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (!socket) return;
    const onUp = () => void load();
    socket.on('message:new', onUp);
    socket.on('room:created', onUp);
    socket.on('message:read', onUp);
    socket.on('unread:update', onUp);
    return () => {
      socket.off('message:new', onUp);
      socket.off('room:created', onUp);
      socket.off('message:read', onUp);
      socket.off('unread:update', onUp);
    };
  }, [socket, load]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-transparent">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-heading text-xl font-semibold text-white/90 lg:text-2xl">Сообщения</h1>
        {connection === 'connecting' ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-emerald-400" />
        ) : null}
        {connection === 'reconnecting' ? (
          <span className="text-xs text-white/50">
            Переподключение ({Math.min(reconnectAttempt, MAX_ATTEMPTS)}/{MAX_ATTEMPTS})…
          </span>
        ) : null}
      </div>

      {connection === 'failed' ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/65">
          <span>Нет соединения.</span>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
            onClick={() => socket?.connect()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Попробовать снова
          </button>
        </div>
      ) : null}

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по имени"
          className="w-full rounded-input border border-white/10 bg-white/[0.06] py-2 pl-10 pr-3 text-sm text-white placeholder:text-white/30 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
        />
      </div>

      {error && (
        <p className="mb-3 rounded-input border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>
      )}
      {loading && (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-[12px] bg-white/[0.06]" />
          ))}
        </div>
      )}
      {!loading && rooms.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-[12px] border border-white/[0.08] bg-white/[0.03] py-14 text-center">
          <MessageSquare className="h-10 w-10 text-white/40" />
          <p className="font-medium text-white/65">У вас пока нет диалогов</p>
          {emptyCtaHref && emptyCtaLabel ? (
            <Link href={emptyCtaHref} className="text-sm font-semibold text-emerald-400 hover:underline">
              {emptyCtaLabel}
            </Link>
          ) : (
            <p className="text-sm text-white/50">
              Переписка откроется после отклика, приглашения или смены
            </p>
          )}
        </div>
      )}
      {!loading && rooms.length > 0 && (
        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {rooms.map((r) => {
            const isActive = activeRoomId === r.id;
            const hasUnread = r.unreadCount > 0;
            return (
            <li key={r.id}>
              <Link
                href={hrefForRoom(r.id)}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'flex items-start gap-3 rounded-[12px] border-l-[3px] px-4 py-3 transition',
                  isActive
                    ? 'border-l-emerald-500 bg-[rgba(45,106,74,0.18)] shadow-[inset_0_0_0_1px_rgba(45,106,74,0.25)]'
                    : hasUnread
                      ? 'border-l-emerald-500/40 bg-white/[0.05] hover:bg-white/[0.08] hover:border-l-emerald-500/70'
                      : 'border-l-transparent bg-white/[0.03] hover:bg-white/[0.06] hover:border-l-emerald-500/50',
                ].join(' ')}
              >
                <div className="relative h-12 w-12 shrink-0">
                  <div className="h-12 w-12 overflow-hidden rounded-full bg-white/10">
                    {r.peer.avatarUrl ? (
                      <Image
                        src={resolveMediaUrl(r.peer.avatarUrl) ?? ''}
                        alt=""
                        width={48}
                        height={48}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center text-sm font-medium text-white/50">
                        {r.peer.displayName.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  {r.unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 z-10 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white ring-2 ring-[#0d1f17]">
                      {r.unreadCount > 99 ? '99+' : r.unreadCount}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className={`truncate font-medium ${isActive ? 'text-white' : 'text-white/90'}`}>{r.peer.displayName}</p>
                    {r.lastMessage && (
                      <time className="shrink-0 text-xs text-white/50" dateTime={r.lastMessage.createdAt}>
                        {formatChatTime(r.lastMessage.createdAt)}
                      </time>
                    )}
                  </div>
                  {r.contextSubtitle ? (
                    <p className="truncate text-[11px] text-white/50">{r.contextSubtitle}</p>
                  ) : null}
                  <p className="truncate text-sm text-white/55">
                    {r.lastMessage?.isSystem ? r.lastMessage.text : r.lastMessage?.text ?? 'Нет сообщений'}
                  </p>
                </div>
              </Link>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
