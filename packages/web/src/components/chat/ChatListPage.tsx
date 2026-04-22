'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useChatSocket } from '@/components/chat/ChatInboxProvider';
import { apiClient } from '@/lib/api/client';
import { formatChatTime } from '@/components/chat/chat-format';
import { useChatInboxStore } from '@/stores/chatInboxStore';

type RoomRow = {
  id: string;
  createdAt: string;
  peer: { displayName: string; role: 'worker' | 'employer'; avatarUrl: string | null };
  lastMessage: {
    id: string;
    text: string | null;
    createdAt: string;
    isSystem: boolean;
    senderId: string;
    type: string;
  } | null;
  unreadCount: number;
};

export function ChatListPage() {
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const socket = useChatSocket();
  const connection = useChatInboxStore((s) => s.connection);

  const load = useCallback(() => {
    return apiClient
      .get<{ data: { rooms: RoomRow[] } }>('/chat/rooms')
      .then((r) => setRooms(r.data.rooms))
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      });
  }, []);

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
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-gray-900">Сообщения</h1>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span
            className={
              connection === 'connected'
                ? 'text-emerald-600'
                : connection === 'reconnecting'
                ? 'text-amber-600'
                : 'text-gray-400'
            }
          >
            {connection === 'connected' && '● Онлайн'}
            {connection === 'reconnecting' && '● Подключение…'}
            {connection === 'disconnected' && '○ Нет сети'}
            {connection === 'connecting' && '○ Подключаюсь…'}
          </span>
        </div>
      </div>
      {error && (
        <p className="mb-4 rounded-input border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {loading && <p className="text-gray-500">Загрузка…</p>}
      {!loading && rooms.length === 0 && (
        <p className="text-gray-600">Пока нет переписок. Чат открывается после отклика, приглашения или заказа.</p>
      )}
      <ul className="divide-y divide-gray-200 overflow-hidden rounded-input border border-gray-200 bg-white">
        {rooms.map((r) => (
          <li key={r.id}>
            <Link
              href={`/dashboard/chat/${r.id}`}
              className="flex items-start gap-3 px-4 py-3 transition hover:bg-primary-50/50"
            >
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gray-100">
                {r.peer.avatarUrl ? (
                  <Image src={r.peer.avatarUrl} alt="" width={48} height={48} className="h-12 w-12 object-cover" unoptimized />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center text-sm font-medium text-gray-500">
                    {r.peer.displayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                {r.unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary-500 px-1 text-[10px] font-bold text-white">
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
                <p className="mt-0.5 truncate text-sm text-gray-500">
                  {r.lastMessage?.isSystem
                    ? r.lastMessage.text
                    : r.lastMessage
                    ? r.lastMessage.text
                    : 'Нет сообщений'}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
