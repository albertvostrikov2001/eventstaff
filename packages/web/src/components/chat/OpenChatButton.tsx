'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/stores/authStore';

export type ChatOpenContextPayload =
  | { type: 'GENERAL' }
  | { type: 'APPLICATION'; id: string }
  | { type: 'INVITATION'; id: string }
  | { type: 'SHIFT'; id: string }
  | { type: 'VACANCY'; id: string };

type Props = {
  recipientUserId: string;
  className?: string;
  label?: string;
  /** Если задан — уходит на /chat/rooms/open вместо авто-подстановки контекста */
  context?: ChatOpenContextPayload;
};

/**
 * Открывает (или создаёт) чат с пользователем при наличии связи по правилам canChat.
 */
export function OpenChatButton({ recipientUserId, className, label = 'Написать', context }: Props) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [suggested, setSuggested] = useState<ChatOpenContextPayload | null>(null);
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    let cancelled = false;
    setAllowed(null);
    apiClient
      .get<{ data: { canChat: boolean; suggestedContext: ChatOpenContextPayload | null } }>(
        '/chat/can-chat',
        {
          recipientId: recipientUserId,
        },
      )
      .then((r) => {
        if (!cancelled) {
          setAllowed(r.data.canChat);
          setSuggested(r.data.suggestedContext ?? { type: 'GENERAL' });
        }
      })
      .catch(() => {
        if (!cancelled) setAllowed(false);
      });
    return () => {
      cancelled = true;
    };
  }, [recipientUserId]);

  const messagesHref = user?.activeRole === 'worker' ? '/worker/messages' : '/employer/messages';

  const open = async () => {
    const ctxPayload = context ?? suggested ?? ({ type: 'GENERAL' } satisfies ChatOpenContextPayload);
    setErr(null);
    setLoading(true);
    try {
      const r = await apiClient.post<{
        data: { room: { id: string; contextType: string }; created: boolean };
      }>('/chat/rooms/open', {
        recipientId: recipientUserId,
        context: ctxPayload,
      });
      router.push(`${messagesHref}/${r.data.room.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'CHAT_NOT_ALLOWED') {
        setErr('Чат пока недоступен');
      } else if (e instanceof ApiError && e.code === 'BAD_CONTEXT') {
        setErr('Неверный контекст');
      } else {
        setErr('Не удалось открыть чат');
      }
    } finally {
      setLoading(false);
    }
  };

  if (allowed === false) return null;

  return (
    <div>
      {err && <p className="mb-1 text-xs text-red-600">{err}</p>}
      <button
        type="button"
        disabled={loading || allowed === null}
        onClick={() => void open()}
        className={className}
      >
        <span className="inline-flex items-center gap-1.5">
          <MessageCircle className="h-4 w-4" />
          {allowed === null ? '…' : loading ? '…' : label}
        </span>
      </button>
    </div>
  );
}
