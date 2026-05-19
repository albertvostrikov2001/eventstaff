'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useChatSocket } from '@/components/chat/ChatInboxProvider';
import { apiClient } from '@/lib/api/client';
import { formatChatTime } from '@/components/chat/chat-format';
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
};

export function ChatListPage({
  hrefForRoom,
  emptyCtaHref,
  emptyCtaLabel,
}: ChatListPageProps) {
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const socket = useChatSocket();
  const connection = useChatInboxStore((s) => s.connection);

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
    const onUp = () => {
      void load();
    };
    socket.on('message:new', onUp);
    socket.on('room:created', onUp);
    return () => {
      socket.off('message:new', onUp);
      socket.off('room:created', onUp);
    };
  }, [socket, load]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-heading text-xl font-bold text-gray-900 lg:text-2xl">Сообщения</h1>
        <span
          className={
            connection === 'connected'
              ? 'text-xs text-emerald-600'
              : connection === 'reconnecting'
                ? 'text-xs text-amber-600'
                : 'text-xs text-gray-400'
          }
        >
          {connection === 'connected' && '● Онлайн'}
          {connection === 'reconnecting' && '● Переподключение…'}
          {connection === 'disconnected' && '○ Офлайн'}
          {connection === 'connecting' && '○ Подключение…'}
        </span>
      </div>

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по имени"
          className="w-full rounded-input border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      {error && (
        <p className="mb-3 rounded-input border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {loading && <p className="text-gray-500">Загрузка…</p>}
      {!loading && rooms.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-input border border-gray-200 bg-white py-14 text-center">
          <p className="font-medium text-gray-900">У вас пока нет диалогов</p>
          {emptyCtaHref && emptyCtaLabel && (
            <Link
              href={emptyCtaHref}
              className="text-sm font-semibold text-emerald-700 underline hover:text-emerald-800"
            >
              {emptyCtaLabel}
            </Link>
          )}
          {!emptyCtaHref && (
            <p className="text-sm text-gray-500">
              Переписка откроется после отклика, приглашения или смены
            </p>
          )}
        </div>
      )}
      {!loading && rooms.length > 0 && (
        <ul className="min-h-0 flex-1 divide-y divide-gray-200 overflow-y-auto rounded-input border border-gray-200 bg-white">
          {rooms.map((r) => (
            <li key={r.id}>
              <Link
                href={hrefForRoom(r.id)}
                className="flex items-start gap-3 px-4 py-3 transition hover:bg-emerald-50/40"
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gray-100">
                  {r.peer.avatarUrl ? (
                    <Image src={r.peer.avatarUrl} alt="" width={48} height={48} className="object-cover" unoptimized />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center text-sm font-medium text-gray-500">
                      {r.peer.displayName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  {r.unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white">
                      {r.unreadCount > 99 ? '99+' : r.unreadCount}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate font-medium text-gray-900">{r.peer.displayName}</p>
                    {r.lastMessage && (
                      <time className="shrink-0 text-xs text-gray-400" dateTime={r.lastMessage.createdAt}>
                        {formatChatTime(r.lastMessage.createdAt)}
                      </time>
                    )}
                  </div>
                  {r.contextSubtitle ? (
                    <p className="truncate text-[11px] text-gray-500">{r.contextSubtitle}</p>
                  ) : null}
                  <p className="truncate text-sm text-gray-500">
                    {r.lastMessage?.isSystem ? r.lastMessage.text : r.lastMessage?.text ?? 'Нет сообщений'}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
