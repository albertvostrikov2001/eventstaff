'use client';

import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, CheckCheck, Send } from 'lucide-react';
import { useChatSocket } from '@/components/chat/ChatInboxProvider';
import { apiClient, ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/stores/authStore';
import { useChatInboxStore } from '@/stores/chatInboxStore';
import { dayDividerLabel, isSameDay, formatChatTime } from '@/components/chat/chat-format';

type MessageRow = {
  id: string;
  type: string;
  text: string | null;
  isRead: boolean;
  readAt: string | null;
  isSystem: boolean;
  senderId: string;
  createdAt: string;
  clientId?: string;
  _optimistic?: boolean;
};

type RoomMeta = {
  id: string;
  createdAt: string;
  peer: { displayName: string; role: 'worker' | 'employer'; avatarUrl: string | null };
  lastMessage: { id: string; text: string | null; createdAt: string; isSystem: boolean; senderId: string; type: string } | null;
  unreadCount: number;
};

export function ChatRoomView() {
  const params = useParams();
  const roomId = String(params?.roomId ?? '');
  const router = useRouter();
  const { user } = useAuthStore();
  const socket = useChatSocket();
  const connection = useChatInboxStore((s) => s.connection);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [meta, setMeta] = useState<RoomMeta | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const userId = user?.id;

  const scrollBottom = useCallback(() => {
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));
  }, []);

  const load = useCallback(() => {
    if (!roomId) return;
    return Promise.all([
      apiClient
        .get<{ data: { room: RoomMeta } }>(`/chat/rooms/${roomId}`)
        .then((r) => setMeta(r.data.room))
        .catch((e) => {
          if (e instanceof ApiError && e.status === 404) {
            setErr('Чат не найден');
            return;
          }
          setErr(e instanceof Error ? e.message : 'Ошибка');
        }),
      apiClient
        .get<{
          data: { messages: MessageRow[] };
          meta: { page: number; totalPages: number; total: number };
        }>('/chat/rooms/' + roomId + '/messages', { page: 1, limit: 50 })
        .then((r) => {
          setMessages(r.data.messages);
          setPage(r.meta.page);
          setTotalPages(r.meta.totalPages);
        })
        .catch(() => {}),
    ]).then(() => setLoading(false));
  }, [roomId]);

  useEffect(() => {
    setLoading(true);
    setErr(null);
    setMeta(null);
    setMessages([]);
    void load();
  }, [load]);

  useEffect(() => {
    if (!socket || !roomId) return;
    socket.emit('room:join', { roomId });
    socket.emit('message:read', { roomId });
  }, [socket, roomId]);

  useEffect(() => {
    if (!socket || !roomId) return;
    const onNew = (payload: { roomId: string; message: MessageRow; clientId?: string }) => {
      if (payload.roomId !== roomId) return;
      if (userId && payload.message.senderId !== userId) {
        socket.emit('message:read', { roomId });
      }
      setMessages((prev) => {
        if (prev.some((m) => m.id === payload.message.id)) return prev;
        if (payload.clientId) {
          const f = prev.filter(
            (m) => m.clientId !== payload.clientId && m.id !== payload.message.id,
          );
          return [...f, payload.message].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );
        }
        if (prev.some((m) => m._optimistic && m.text === payload.message.text && m.senderId === payload.message.senderId)) {
          return prev
            .filter((m) => !m._optimistic)
            .concat([payload.message])
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        }
        return [...prev, payload.message].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
      });
    };
    const onRead = (p: { roomId: string; messageIds: string[]; readBy: string; readAt: string }) => {
      if (p.roomId !== roomId) return;
      if (!userId || p.readBy === userId) return;
      setMessages((prev) =>
        prev.map((m) =>
          p.messageIds.includes(m.id) && m.senderId === userId
            ? { ...m, isRead: true, readAt: p.readAt }
            : m,
        ),
      );
    };
    socket.on('message:new', onNew);
    socket.on('message:read', onRead);
    return () => {
      socket.off('message:new', onNew);
      socket.off('message:read', onRead);
    };
  }, [socket, roomId, userId]);

  useEffect(() => {
    scrollBottom();
  }, [messages.length, scrollBottom]);

  const send = () => {
    const t = input.trim();
    if (!t || !socket || !userId) return;
    const clientId = `c-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setInput('');
    const optimistic: MessageRow = {
      id: 'tmp-' + clientId,
      type: 'TEXT',
      text: t,
      isRead: false,
      readAt: null,
      isSystem: false,
      senderId: userId,
      createdAt: new Date().toISOString(),
      clientId,
      _optimistic: true,
    };
    setMessages((m) => [...m, optimistic]);
    socket.emit('message:send', { roomId, text: t, clientId });
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (err) {
    return (
      <div>
        <button type="button" onClick={() => router.push('/dashboard/chat')} className="mb-4 text-sm text-primary-600">
          ← К списку
        </button>
        <p className="text-red-600">{err}</p>
      </div>
    );
  }

  if (loading && !meta) {
    return <p className="text-gray-500">Загрузка…</p>;
  }

  return (
    <div className="flex h-[min(100vh-8rem,720px)] flex-col">
      <header className="mb-2 flex items-center gap-3 border-b border-gray-200 pb-3">
        <button
          type="button"
          onClick={() => router.push('/dashboard/chat')}
          className="rounded-input p-1.5 text-gray-600 hover:bg-gray-100"
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        {meta && (
          <>
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-100">
              {meta.peer.avatarUrl ? (
                <Image src={meta.peer.avatarUrl} alt="" width={40} height={40} className="object-cover" unoptimized />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center text-sm font-medium text-gray-500">
                  {meta.peer.displayName.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900">{meta.peer.displayName}</p>
              <p className="text-xs text-gray-500">
                {meta.peer.role === 'worker' ? 'Исполнитель' : 'Работодатель'}
              </p>
            </div>
          </>
        )}
        <div className="ml-auto text-xs text-gray-400">
          {connection === 'connected' ? '●' : connection === 'reconnecting' ? '…' : '○'}
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-input border border-gray-200 bg-white p-4">
        {page < totalPages && (
          <button
            type="button"
            className="w-full text-center text-xs text-primary-600"
            onClick={() => {
              const next = page + 1;
              void apiClient
                .get<{
                  data: { messages: MessageRow[] };
                  meta: { page: number; totalPages: number };
                }>('/chat/rooms/' + roomId + '/messages', { page: next, limit: 50 })
                .then((r) => {
                  setPage(r.meta.page);
                  setTotalPages(r.meta.totalPages);
                  setMessages((prev) => {
                    const merged = [...r.data.messages, ...prev];
                    const byId = new Map(merged.map((m) => [m.id, m]));
                    return Array.from(byId.values()).sort(
                      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
                    );
                  });
                });
            }}
          >
            Загрузить раньше
          </button>
        )}
        {messages.map((m, i) => {
          const showDay = i === 0 || !isSameDay(m.createdAt, messages[i - 1].createdAt);
          const isMine = userId && m.senderId === userId;
          return (
            <div key={m.id}>
              {showDay && (
                <div className="my-4 flex items-center justify-center">
                  <span className="rounded-full bg-gray-100 px-3 py-0.5 text-xs text-gray-500">
                    {dayDividerLabel(m.createdAt)}
                  </span>
                </div>
              )}
              {m.isSystem ? (
                <p className="text-center text-xs text-gray-500">{m.text}</p>
              ) : (
                <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      isMine
                        ? 'bg-primary-500 text-white'
                        : 'border border-gray-200 bg-gray-50 text-gray-900'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.text}</p>
                    <div
                      className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${
                        isMine ? 'text-primary-100' : 'text-gray-400'
                      }`}
                    >
                      <time dateTime={m.createdAt}>{formatChatTime(m.createdAt)}</time>
                      {isMine && (
                        <span className="inline-flex" title={m.isRead ? 'Прочитано' : 'Отправлено'}>
                          {m.isRead ? <CheckCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="mt-3 flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          rows={1}
          placeholder="Сообщение…"
          className="min-h-[44px] flex-1 resize-y rounded-input border border-gray-300 px-3 py-2 text-sm text-gray-900"
        />
        <button
          type="button"
          onClick={send}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-input bg-primary-500 text-white hover:bg-primary-600"
          aria-label="Отправить"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
