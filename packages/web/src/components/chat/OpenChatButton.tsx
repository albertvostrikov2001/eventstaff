'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api/client';

type Props = { recipientUserId: string; className?: string; label?: string };

/**
 * Открывает (или создаёт) чат с пользователем при наличии связи (отклик, приглашение, заказ).
 */
export function OpenChatButton({ recipientUserId, className, label = 'Написать' }: Props) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div>
      {err && <p className="mb-1 text-xs text-red-600">{err}</p>}
      <button
        type="button"
        disabled={loading}
        onClick={async () => {
          setErr(null);
          setLoading(true);
          try {
            const r = await apiClient.post<{ data: { room: { id: string }; created: boolean } }>(
              '/chat/rooms',
              { recipientId: recipientUserId },
            );
            router.push(`/dashboard/chat/${r.data.room.id}`);
          } catch (e) {
            if (e instanceof ApiError && e.code === 'CHAT_NOT_ALLOWED') {
              setErr('Чат с этим пользователем пока недоступен');
            } else {
              setErr('Не удалось открыть чат');
            }
          } finally {
            setLoading(false);
          }
        }}
        className={className}
      >
        <span className="inline-flex items-center gap-1.5">
          <MessageCircle className="h-4 w-4" />
          {loading ? '…' : label}
        </span>
      </button>
    </div>
  );
}
