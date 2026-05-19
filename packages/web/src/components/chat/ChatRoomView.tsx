'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, CheckCheck, Menu, Plus, Send, BadgeCheck } from 'lucide-react';
import { useChatSocket } from '@/components/chat/ChatInboxProvider';
import { apiClient, ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/stores/authStore';
import { useChatInboxStore } from '@/stores/chatInboxStore';
import { useToast } from '@/components/ui/toast-context';
import { dayDividerLabel, isSameDay, formatChatTime } from '@/components/chat/chat-format';

type MessageRow = {
  id: string;
  roomId?: string;
  type: string;
  text: string | null;
  isRead: boolean;
  readAt: string | null;
  isSystem: boolean;
  senderId: string;
  createdAt: string;
  clientId?: string;
  _optimistic?: boolean;
  _failed?: boolean;
};

type RoomPeer = {
  displayName: string;
  role: 'worker' | 'employer';
  avatarUrl: string | null;
  verified?: boolean;
};

export type ChatRoomDetail = {
  id: string;
  createdAt: string;
  lastMessageAt?: string;
  peer: RoomPeer;
  workerProfileId?: string | null;
  peerInactive?: boolean;
  contextSubtitle?: string | null;
  vacancyHref?: string | null;
  vacancyUnavailable?: boolean;
  vacancyTitle?: string | null;
  vacancyId?: string | null;
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

const MAX_INPUT = 2000;

export type ChatRoomViewProps = {
  /** Куда «Назад»: список диалогов */
  listHref?: string;
};

export function ChatRoomView({ listHref = '/dashboard/chat' }: ChatRoomViewProps) {
  const params = useParams();
  const roomId = String((params?.roomId ?? params?.id) ?? '');
  const router = useRouter();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const socket = useChatSocket();
  const connection = useChatInboxStore((s) => s.connection);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [meta, setMeta] = useState<ChatRoomDetail | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const userId = user?.id;

  const scrollBottom = useCallback(() => {
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));
  }, []);

  const load = useCallback(() => {
    if (!roomId) return;
    return Promise.all([
      apiClient
        .get<{ data: { room: ChatRoomDetail } }>(`/chat/rooms/${roomId}`)
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
    if (!roomId || !userId) return;
    void apiClient.patch(`/chat/rooms/${roomId}/read`).catch(() => {});
  }, [roomId, userId]);

  useEffect(() => {
    if (!socket || !roomId) return;
    socket.emit('room:join', { roomId }, () => {});
  }, [socket, roomId]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && roomId && userId) {
        void apiClient.patch(`/chat/rooms/${roomId}/read`).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [roomId, userId]);

  useEffect(() => {
    if (!socket || !roomId) return;
    const onNew = (payload: { roomId: string; message: MessageRow; clientId?: string }) => {
      if (payload.roomId !== roomId) return;
      if (userId && payload.message.senderId !== userId) {
        void apiClient.patch(`/chat/rooms/${roomId}/read`).catch(() => {});
      }
      setMessages((prev) => {
        if (prev.some((m) => m.id === payload.message.id)) return prev;
        if (payload.message.senderId === userId && prev.some((m) => m._optimistic && m.senderId === userId)) {
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

  const autosizeTa = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const lh = 24;
    const maxH = lh * 4 + 24;
    el.style.height = `${Math.min(el.scrollHeight, maxH)}px`;
  };

  useEffect(() => {
    autosizeTa();
  }, [input]);

  const submitOutgoing = async (explicitText?: string) => {
    const tSource = explicitText ?? input;
    const t = tSource.trim();
    if (!t || !userId || !roomId || sending) return;
    if (t.length > MAX_INPUT) {
      toast(`Не более ${MAX_INPUT} символов`, 'error');
      return;
    }
    setSending(true);
    const optimisticId = `tmp-send-${Date.now()}`;
    const optimistic: MessageRow = {
      id: optimisticId,
      type: 'TEXT',
      text: t,
      isRead: false,
      readAt: null,
      isSystem: false,
      senderId: userId,
      createdAt: new Date().toISOString(),
      _optimistic: true,
      _failed: false,
    };
    setMessages((prev) => [...prev, optimistic]);
    if (explicitText === undefined) setInput('');
    try {
      const res = await apiClient.post<{ data: { message: MessageRow } }>(
        `/chat/rooms/${roomId}/messages`,
        {
          text: t,
        },
      );
      const saved = res.data.message;
      setMessages((prev) =>
        [...prev.filter((m) => m.id !== optimisticId), saved].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? { ...m, _failed: true, _optimistic: false } : m)),
      );
      toast('Сообщение не отправлено', 'error');
      if (explicitText === undefined) setInput(t);
    } finally {
      setSending(false);
    }
  };

  const retryFailed = async (failedRow: MessageRow) => {
    if (!failedRow.text || !roomId) return;
    setMessages((prev) => prev.filter((m) => m.id !== failedRow.id));
    await submitOutgoing(failedRow.text);
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submitOutgoing();
    }
  };

  const backToList = () => router.push(listHref);

  if (err) {
    return (
      <div className="p-4">
        <button type="button" onClick={backToList} className="mb-4 text-sm text-emerald-600">
          ← К списку
        </button>
        <p className="text-red-600">{err}</p>
      </div>
    );
  }

  if (loading && !meta) {
    return <p className="p-4 text-gray-500">Загрузка…</p>;
  }

  const peerInactive = !!meta?.peerInactive;
  const showVerified = meta?.peer.role === 'worker' && meta.peer.verified;
  const ctxLine = meta?.contextSubtitle ?? null;

  return (
    <div className="flex h-[100dvh] flex-col lg:h-[min(100vh-7rem,800px)]">
      <header className="sticky top-0 z-10 flex shrink-0 items-start gap-2 border-b border-gray-200 bg-white px-3 py-2 lg:rounded-input lg:border-0 lg:px-0">
        <button
          type="button"
          onClick={backToList}
          className="rounded-input p-1.5 text-gray-600 hover:bg-gray-100 lg:hidden"
          aria-label="Назад к списку"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        {meta && (
          <>
            <div
              className={`relative h-10 w-10 shrink-0 overflow-hidden rounded-full ${
                meta.peer.role === 'employer' ? '' : 'bg-gray-100'
              }`}
              style={
                meta.peer.role === 'employer' && !meta.peer.avatarUrl
                  ? { backgroundColor: 'var(--color-emerald, var(--u-emerald, #2d6a4a))' }
                  : undefined
              }
            >
              {meta.peer.avatarUrl ? (
                <Image src={meta.peer.avatarUrl} alt="" width={40} height={40} className="object-cover" unoptimized />
              ) : (
                <div
                  className={`flex h-10 w-10 items-center justify-center text-sm font-medium ${
                    meta.peer.role === 'employer' ? 'text-white' : 'text-gray-500'
                  }`}
                >
                  {meta.peer.displayName.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1">
                <p className="truncate font-medium text-gray-900">{meta.peer.displayName}</p>
                {showVerified && (
                  <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-label="Верифицирован" />
                )}
                <span className="ml-auto shrink-0 text-xs text-gray-400 lg:hidden">
                  {connection === 'connected' ? '●' : connection === 'reconnecting' ? '…' : '○'}
                </span>
              </div>
              {meta.vacancyHref && meta.vacancyTitle && !meta.vacancyUnavailable ? (
                <Link href={meta.vacancyHref} className="block truncate text-xs text-emerald-700 underline">
                  По вакансии: {meta.vacancyTitle}
                </Link>
              ) : ctxLine ? (
                <p className="truncate text-xs text-gray-500">{ctxLine}</p>
              ) : (
                <p className="text-xs text-gray-500">
                  {meta.peer.role === 'worker' ? 'Исполнитель' : 'Работодатель'}
                </p>
              )}
            </div>
            <details className="relative shrink-0">
              <summary className="list-none cursor-pointer rounded-input p-1.5 text-gray-600 hover:bg-gray-100 [&::-webkit-details-marker]:hidden">
                <Menu className="h-5 w-5" />
              </summary>
              <div className="absolute right-0 mt-1 w-52 rounded-input border border-gray-200 bg-white py-1 text-sm shadow-lg">
                {meta.workerProfileId ? (
                  <Link
                    href={`/workers/${meta.workerProfileId}`}
                    className="block px-3 py-2 hover:bg-gray-50"
                  >
                    Профиль исполнителя
                  </Link>
                ) : null}
                {meta.vacancyHref && meta.vacancyTitle && !meta.vacancyUnavailable ? (
                  <Link href={meta.vacancyHref} className="block px-3 py-2 hover:bg-gray-50">
                    Открыть вакансию
                  </Link>
                ) : (
                  meta.vacancyUnavailable && (
                    <span className="block px-3 py-2 text-gray-400">Вакансия недоступна</span>
                  )
                )}
              </div>
            </details>
            <span className="hidden text-xs text-gray-400 lg:inline">
              {connection === 'connected' ? '●' : connection === 'reconnecting' ? '…' : '○'}
            </span>
          </>
        )}
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-gray-50/80 p-3 lg:rounded-input lg:border lg:border-gray-200 lg:bg-white lg:p-4">
        {page < totalPages && (
          <button
            type="button"
            className="w-full text-center text-xs text-emerald-600"
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
                  <span className="rounded-full bg-gray-200/90 px-3 py-0.5 text-xs text-gray-600">
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
                        ? m._failed
                          ? 'border border-red-200 bg-red-50 text-gray-900'
                          : 'bg-emerald-600 text-white shadow-sm'
                        : 'border border-gray-200 bg-white text-gray-900 shadow-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.text}</p>
                    {m._failed && (
                      <button
                        type="button"
                        className="mt-1 text-xs font-medium text-red-700 underline"
                        onClick={() => void retryFailed(m)}
                      >
                        Повторить отправку
                      </button>
                    )}
                    <div
                      className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${
                        isMine ? (m._failed ? 'text-red-700' : 'text-emerald-100') : 'text-gray-400'
                      }`}
                    >
                      <time dateTime={m.createdAt}>{formatChatTime(m.createdAt)}</time>
                      {isMine && !m._failed && !m._optimistic && (
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

      <div className="sticky bottom-0 shrink-0 border-t border-gray-200 bg-white p-3">
        {peerInactive ? (
          <p className="rounded-input bg-gray-100 px-3 py-3 text-center text-sm text-gray-600">
            Этот пользователь больше не активен на платформе.
          </p>
        ) : (
          <div className="flex items-end gap-2">
            <button
              type="button"
              disabled
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-input border border-gray-200 text-gray-400"
              title="Вложения — скоро"
              aria-label="Вложения"
            >
              <Plus className="h-5 w-5" />
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              maxLength={MAX_INPUT}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Напишите сообщение…"
              disabled={sending}
              rows={1}
              className="max-h-[7.5rem] min-h-[44px] flex-1 resize-none overflow-y-auto rounded-input border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="button"
              disabled={sending || !input.trim()}
              onClick={() => void submitOutgoing()}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-input bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
              aria-label="Отправить"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
