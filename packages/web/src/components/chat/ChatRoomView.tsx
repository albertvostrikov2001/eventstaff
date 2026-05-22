'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Check, CheckCheck, Menu, Send, BadgeCheck, RefreshCw,
  Paperclip, Reply, Flag, X, FileText, Download, CornerUpLeft,
} from 'lucide-react';
import { useChatSocket, MAX_ATTEMPTS } from '@/components/chat/ChatInboxProvider';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { resolveMediaUrl } from '@/lib/media/url';
import { apiClient, ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/stores/authStore';
import { useChatInboxStore } from '@/stores/chatInboxStore';
import { useToast } from '@/components/ui/toast-context';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { dayDividerLabel, isSameDay, formatChatTime } from '@/components/chat/chat-format';

type MessageRow = {
  id: string;
  roomId?: string;
  type: string;
  text: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  replyToId?: string | null;
  replyToText?: string | null;
  replyToSenderName?: string | null;
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
  listHref?: string;
  employerBreadcrumbParent?: { label: string; href: string };
};

function isImageUrl(url: string, name?: string | null) {
  const ext = (name ?? url).split('.').pop()?.toLowerCase() ?? '';
  return ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
}

function FileAttachment({ url, name }: { url: string; name: string }) {
  if (isImageUrl(url, name)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        <img src={url} alt={name} className="max-h-52 max-w-full rounded-[8px] object-contain" />
        <p className="mt-1 truncate text-[11px] text-white/40">{name}</p>
      </a>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      download={name}
      className="flex items-center gap-2 rounded-[8px] bg-white/[0.08] px-3 py-2 text-sm text-white/80 hover:bg-white/[0.12]"
    >
      <FileText className="h-4 w-4 shrink-0 text-emerald-400" />
      <span className="min-w-0 flex-1 truncate">{name}</span>
      <Download className="h-3.5 w-3.5 shrink-0 text-white/40" />
    </a>
  );
}

export function ChatRoomView({
  listHref = '/dashboard/chat',
  employerBreadcrumbParent,
}: ChatRoomViewProps) {
  const params = useParams();
  const roomId = String((params?.roomId ?? params?.id) ?? '');
  const router = useRouter();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const connection = useChatInboxStore((s) => s.connection);
  const reconnectAttempt = useChatInboxStore((s) => s.reconnectAttempt);
  const socket = useChatSocket();
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userId = user?.id;

  // Reply state
  const [replyTo, setReplyTo] = useState<MessageRow | null>(null);

  // File attachment state
  const [pendingFile, setPendingFile] = useState<{ url: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  // Complaint state
  const [reportingMsg, setReportingMsg] = useState<MessageRow | null>(null);
  const [reportDesc, setReportDesc] = useState('');
  const [reportSending, setReportSending] = useState(false);

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

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast('Файл больше 10 МБ', 'error');
      e.target.value = '';
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', 'CHAT_FILE');
      const res = await apiClient.postMultipart<{ data: { url: string; filename: string } }>(
        '/media/upload',
        fd,
      );
      setPendingFile({ url: res.data.url, name: file.name });
    } catch {
      toast('Ошибка загрузки файла', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const submitOutgoing = async (opts?: { text?: string; fileUrl?: string; fileName?: string; replyToId?: string; replyToText?: string; replyToSenderName?: string }) => {
    const t = (opts?.text ?? input).trim();
    const fUrl = opts?.fileUrl ?? pendingFile?.url ?? null;
    const fName = opts?.fileName ?? pendingFile?.name ?? null;
    const rId = opts?.replyToId ?? replyTo?.id ?? null;
    const rText = opts?.replyToText ?? replyTo?.text ?? null;
    const rSender = opts?.replyToSenderName ?? (replyTo ? (replyTo.senderId === userId ? 'Вы' : (meta?.peer.displayName ?? null)) : null);

    if (!t && !fUrl || !userId || !roomId || sending) return;
    if (t.length > MAX_INPUT) {
      toast(`Не более ${MAX_INPUT} символов`, 'error');
      return;
    }

    setSending(true);
    const optimisticId = `tmp-send-${Date.now()}`;
    const optimistic: MessageRow = {
      id: optimisticId,
      type: fUrl ? 'FILE' : 'TEXT',
      text: t || null,
      fileUrl: fUrl,
      fileName: fName,
      replyToId: rId,
      replyToText: rText,
      replyToSenderName: rSender,
      isRead: false,
      readAt: null,
      isSystem: false,
      senderId: userId,
      createdAt: new Date().toISOString(),
      _optimistic: true,
      _failed: false,
    };
    setMessages((prev) => [...prev, optimistic]);
    if (!opts) {
      setInput('');
      setPendingFile(null);
      setReplyTo(null);
    }

    try {
      const res = await apiClient.post<{ data: { message: MessageRow } }>(
        `/chat/rooms/${roomId}/messages`,
        {
          text: t || null,
          fileUrl: fUrl,
          fileName: fName,
          replyToId: rId,
          replyToText: rText,
          replyToSenderName: rSender,
        },
      );
      const saved = res.data.message;
      setMessages((prev) => {
        // Dedup: socket may have already added this message
        if (prev.some((m) => m.id === saved.id)) return prev;
        return [...prev.filter((m) => m.id !== optimisticId), saved].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
      });
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? { ...m, _failed: true, _optimistic: false } : m)),
      );
      toast('Сообщение не отправлено', 'error');
      if (!opts) {
        setInput(t);
        setPendingFile(fUrl ? { url: fUrl, name: fName ?? 'файл' } : null);
      }
    } finally {
      setSending(false);
    }
  };

  const retryFailed = async (failedRow: MessageRow) => {
    setMessages((prev) => prev.filter((m) => m.id !== failedRow.id));
    await submitOutgoing({
      text: failedRow.text ?? undefined,
      fileUrl: failedRow.fileUrl ?? undefined,
      fileName: failedRow.fileName ?? undefined,
      replyToId: failedRow.replyToId ?? undefined,
      replyToText: failedRow.replyToText ?? undefined,
      replyToSenderName: failedRow.replyToSenderName ?? undefined,
    });
  };

  const submitReport = async () => {
    if (!reportingMsg || reportDesc.trim().length < 20) {
      toast('Опишите проблему (минимум 20 символов)', 'error');
      return;
    }
    setReportSending(true);
    try {
      await apiClient.post('/foundation/complaints', {
        type: 'MESSAGE',
        targetType: 'MESSAGE',
        targetId: reportingMsg.id,
        description: reportDesc.trim(),
      });
      toast('Жалоба отправлена', 'success');
      setReportingMsg(null);
      setReportDesc('');
    } catch {
      toast('Ошибка отправки жалобы', 'error');
    } finally {
      setReportSending(false);
    }
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
      <div className="flex flex-col items-center justify-center rounded-[14px] border border-white/[0.08] bg-white/[0.03] p-8 text-center">
        <button type="button" onClick={backToList} className="mb-4 self-start text-sm text-emerald-400 hover:underline">
          ← К списку
        </button>
        <p className="text-white/65">{err}</p>
        <button
          type="button"
          className="mt-4 rounded-input border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-white/80 hover:bg-white/[0.1]"
          onClick={() => { setErr(null); setLoading(true); void load(); }}
        >
          Повторить
        </button>
      </div>
    );
  }

  if (loading && !meta) {
    return (
      <>
        {employerBreadcrumbParent ? (
          <Breadcrumbs
            tone="dark"
            items={[
              { label: employerBreadcrumbParent.label, href: employerBreadcrumbParent.href },
              { label: '…' },
            ]}
          />
        ) : null}
        <div className="space-y-3 p-4">
          <div className="h-12 animate-pulse rounded-[12px] bg-white/[0.06]" />
          <div className="h-48 animate-pulse rounded-[12px] bg-white/[0.06]" />
        </div>
      </>
    );
  }

  const peerInactive = !!meta?.peerInactive;
  const showVerified = meta?.peer.role === 'worker' && meta.peer.verified;
  const ctxLine = meta?.contextSubtitle ?? null;

  return (
    <>
      {employerBreadcrumbParent ? (
        <Breadcrumbs
          tone="dark"
          items={[
            { label: employerBreadcrumbParent.label, href: employerBreadcrumbParent.href },
            { label: meta?.peer.displayName ?? 'Диалог' },
          ]}
        />
      ) : null}

      {/* Complaint modal */}
      {reportingMsg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => { setReportingMsg(null); setReportDesc(''); }}
        >
          <div
            className="w-full max-w-sm rounded-[16px] border border-white/[0.08] bg-[#0f1e17] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-heading text-base font-semibold text-white">Жалоба на сообщение</h3>
              <button
                type="button"
                onClick={() => { setReportingMsg(null); setReportDesc(''); }}
                className="rounded-full p-1 text-white/40 hover:bg-white/[0.06] hover:text-white/70"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-3 text-xs text-white/50">Опишите нарушение (минимум 20 символов)</p>
            <textarea
              value={reportDesc}
              onChange={(e) => setReportDesc(e.target.value)}
              placeholder="Опишите, что не так с этим сообщением…"
              className="cabinet-input mb-3 w-full resize-none"
              rows={4}
              maxLength={2000}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setReportingMsg(null); setReportDesc(''); }}
                className="flex-1 rounded-input border border-white/10 bg-white/[0.06] py-2 text-sm text-white/70 hover:bg-white/[0.10]"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => void submitReport()}
                disabled={reportSending || reportDesc.trim().length < 20}
                className="flex-1 rounded-input bg-red-500/80 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-40"
              >
                {reportSending ? 'Отправка…' : 'Пожаловаться'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex h-[100dvh] flex-col lg:h-[min(100vh-7rem,800px)]">
        {connection === 'reconnecting' ? (
          <div className="shrink-0 border-b border-white/[0.07] bg-amber-500/10 px-3 py-1.5 text-center text-xs text-white/65">
            Переподключение ({Math.min(reconnectAttempt, MAX_ATTEMPTS)}/{MAX_ATTEMPTS})…
          </div>
        ) : null}
        {connection === 'failed' ? (
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.07] bg-red-500/10 px-3 py-2 text-sm text-white/65">
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

        <header className="sticky top-0 z-10 flex shrink-0 items-start gap-2 border-b border-white/[0.07] bg-[rgba(13,31,23,0.85)] px-3 py-2.5 backdrop-blur-md lg:rounded-t-[14px]">
          <button
            type="button"
            onClick={backToList}
            className="rounded-input p-1.5 text-white/65 hover:bg-white/[0.06] lg:hidden"
            aria-label="Назад к списку"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          {meta && (
            <>
              <UserAvatar
                src={resolveMediaUrl(meta.peer.avatarUrl)}
                name={meta.peer.displayName}
                size={48}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1">
                  <p className="truncate font-medium text-white">{meta.peer.displayName}</p>
                  {showVerified && (
                    <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-400" aria-label="Верифицирован" />
                  )}
                </div>
                {meta.vacancyHref && meta.vacancyTitle && !meta.vacancyUnavailable ? (
                  <Link href={meta.vacancyHref} className="block truncate text-xs text-emerald-400 hover:underline">
                    По вакансии: {meta.vacancyTitle}
                  </Link>
                ) : ctxLine ? (
                  <p className="truncate text-sm text-white/50">{ctxLine}</p>
                ) : (
                  <p className="text-sm text-white/50">
                    {meta.peer.role === 'worker' ? 'Исполнитель' : 'Работодатель'}
                  </p>
                )}
              </div>
              <details className="relative shrink-0">
                <summary className="list-none cursor-pointer rounded-input p-1.5 text-white/65 hover:bg-white/[0.06] [&::-webkit-details-marker]:hidden">
                  <Menu className="h-5 w-5" />
                </summary>
                <div className="cabinet-dropdown-content absolute right-0 z-20 mt-1 w-52 py-1 text-sm">
                  {meta.workerProfileId ? (
                    <Link href={`/workers/${meta.workerProfileId}`} className="cabinet-dropdown-item block">
                      Профиль исполнителя
                    </Link>
                  ) : null}
                  {meta.vacancyHref && meta.vacancyTitle && !meta.vacancyUnavailable ? (
                    <Link href={meta.vacancyHref} className="cabinet-dropdown-item block">
                      Открыть вакансию
                    </Link>
                  ) : (
                    meta.vacancyUnavailable && (
                      <span className="block px-3 py-2 text-white/40">Вакансия недоступна</span>
                    )
                  )}
                </div>
              </details>
            </>
          )}
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 lg:p-4">
          {page < totalPages && (
            <button
              type="button"
              className="w-full text-center text-xs text-emerald-400 hover:underline"
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
                    <span className="rounded-full border border-white/[0.07] bg-white/[0.04] px-3 py-1 text-xs text-white/40">
                      {dayDividerLabel(m.createdAt)}
                    </span>
                  </div>
                )}
                {m.isSystem ? (
                  <p className="text-center text-xs text-white/40">{m.text}</p>
                ) : (
                  <div className={`group flex items-end gap-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                    {/* Action buttons (visible on hover) */}
                    {isMine ? (
                      <div className="mb-1 flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          title="Ответить"
                          onClick={() => setReplyTo(m)}
                          className="rounded-full p-1 text-white/40 hover:bg-white/[0.08] hover:text-white/70"
                        >
                          <Reply className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="order-last mb-1 flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          title="Ответить"
                          onClick={() => setReplyTo(m)}
                          className="rounded-full p-1 text-white/40 hover:bg-white/[0.08] hover:text-white/70"
                        >
                          <Reply className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Пожаловаться"
                          onClick={() => { setReportingMsg(m); setReportDesc(''); }}
                          className="rounded-full p-1 text-white/40 hover:bg-white/[0.08] hover:text-red-400"
                        >
                          <Flag className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}

                    <div
                      className={`max-w-[80%] px-3 py-2 text-sm ${
                        isMine
                          ? m._failed
                            ? 'rounded-[12px] border border-red-500/40 bg-red-500/10 text-white/90'
                            : 'rounded-[12px_12px_3px_12px] bg-[rgba(45,106,74,0.4)] text-white shadow-sm'
                          : 'rounded-[12px_12px_12px_3px] border border-white/[0.06] bg-white/[0.07] text-white/90'
                      }`}
                    >
                      {/* Reply preview inside bubble */}
                      {m.replyToText && (
                        <div className="mb-1.5 flex gap-1.5 rounded-[6px] border-l-2 border-emerald-500/60 bg-white/[0.06] px-2 py-1">
                          <CornerUpLeft className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400/70" />
                          <div className="min-w-0">
                            {m.replyToSenderName && (
                              <p className="text-[10px] font-medium text-emerald-400/80">{m.replyToSenderName}</p>
                            )}
                            <p className="truncate text-[11px] text-white/50">{m.replyToText.slice(0, 120)}{m.replyToText.length > 120 ? '…' : ''}</p>
                          </div>
                        </div>
                      )}
                      {/* File attachment */}
                      {m.type === 'FILE' && m.fileUrl && (
                        <div className="mb-1">
                          <FileAttachment url={m.fileUrl} name={m.fileName ?? 'файл'} />
                        </div>
                      )}
                      {/* Text */}
                      {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                      {m._failed && (
                        <button
                          type="button"
                          className="mt-1 text-xs font-medium text-red-300 underline"
                          onClick={() => void retryFailed(m)}
                        >
                          Повторить отправку
                        </button>
                      )}
                      <div
                        className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${
                          isMine ? (m._failed ? 'text-red-300' : 'text-white/50') : 'text-white/40'
                        }`}
                      >
                        <time dateTime={m.createdAt}>{formatChatTime(m.createdAt)}</time>
                        {isMine && !m._failed && !m._optimistic && (
                          <span className="inline-flex" title={m.isRead ? 'Прочитано' : 'Отправлено'}>
                            {m.isRead ? (
                              <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
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

        <div className="sticky bottom-0 shrink-0 border-t border-white/[0.07] bg-[rgba(13,31,23,0.9)] backdrop-blur-md">
          {peerInactive ? (
            <p className="px-3 py-3 text-center text-sm text-white/50">
              Этот пользователь больше не активен на платформе.
            </p>
          ) : (
            <>
              {/* Reply preview bar */}
              {replyTo && (
                <div className="flex items-center gap-2 border-b border-white/[0.07] px-3 py-2">
                  <CornerUpLeft className="h-4 w-4 shrink-0 text-emerald-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-emerald-400">
                      {replyTo.senderId === userId ? 'Вы' : (meta?.peer.displayName ?? 'Собеседник')}
                    </p>
                    <p className="truncate text-xs text-white/50">
                      {replyTo.type === 'FILE' ? '📎 Файл' : (replyTo.text?.slice(0, 80) ?? '')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyTo(null)}
                    className="shrink-0 rounded-full p-1 text-white/40 hover:text-white/70"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Pending file preview bar */}
              {pendingFile && (
                <div className="flex items-center gap-2 border-b border-white/[0.07] px-3 py-2">
                  {isImageUrl(pendingFile.url, pendingFile.name) ? (
                    <img src={pendingFile.url} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
                  ) : (
                    <FileText className="h-5 w-5 shrink-0 text-emerald-400" />
                  )}
                  <p className="min-w-0 flex-1 truncate text-sm text-white/70">{pendingFile.name}</p>
                  <button
                    type="button"
                    onClick={() => setPendingFile(null)}
                    className="shrink-0 rounded-full p-1 text-white/40 hover:text-white/70"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="flex items-end gap-2 p-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.mp4"
                  className="hidden"
                  onChange={(e) => void handleFilePick(e)}
                />
                <button
                  type="button"
                  disabled={uploading || sending}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-input border border-white/10 bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white/80 disabled:opacity-40"
                  title="Прикрепить файл"
                  aria-label="Прикрепить файл"
                >
                  {uploading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-emerald-400" />
                  ) : (
                    <Paperclip className="h-5 w-5" />
                  )}
                </button>
                <textarea
                  ref={textareaRef}
                  value={input}
                  maxLength={MAX_INPUT}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKey}
                  placeholder={pendingFile ? 'Добавьте подпись…' : 'Напишите сообщение…'}
                  disabled={sending}
                  rows={1}
                  className="cabinet-input max-h-[7.5rem] min-h-[44px] flex-1 resize-none overflow-y-auto py-2.5"
                />
                <button
                  type="button"
                  disabled={sending || uploading || (!input.trim() && !pendingFile)}
                  onClick={() => void submitOutgoing()}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-input bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-900/20 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-40"
                  aria-label="Отправить"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
