'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient, ApiError } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface PendingRow {
  id: string;
  type: string;
  url: string | null;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
  user: {
    id: string;
    email: string | null;
    activeRole: string | null;
    roles: string[];
    displayName: string;
  };
}

export default function AdminMediaPendingPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<PendingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ data: PendingRow[] }>('/admin/media/pending');
      setRows(res.data);
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) toast('Нет доступа', 'error');
      else toast('Не удалось загрузить список', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const approve = async (id: string) => {
    setBusy(id);
    try {
      await apiClient.patch(`/admin/media/${id}/approve`);
      toast('Файл одобрен', 'success');
      await load();
    } catch {
      toast('Ошибка', 'error');
    } finally {
      setBusy(null);
    }
  };

  const reject = async (id: string) => {
    setBusy(id);
    try {
      await apiClient.patch(`/admin/media/${id}/reject`, { reason: reason || undefined });
      toast('Отклонено', 'success');
      setRejectId(null);
      setReason('');
      await load();
    } catch {
      toast('Ошибка', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-gray-900">Модерация медиа</h1>
      <p className="mt-1 text-sm text-gray-600">Файлы, ожидающие проверки.</p>

      <Button type="button" variant="outline" className="mt-4" onClick={() => void load()} disabled={loading}>
        Обновить
      </Button>

      <div className="mt-6 space-y-6">
        {loading ? (
          <p className="text-gray-500">Загрузка…</p>
        ) : rows.length === 0 ? (
          <p className="text-gray-500">Нет файлов на модерации</p>
        ) : (
          rows.map((r) => (
            <div
              key={r.id}
              className="flex flex-col gap-4 rounded-card border border-gray-200 bg-white p-4 sm:flex-row"
            >
              <div className="h-40 w-full shrink-0 overflow-hidden rounded-lg bg-gray-100 sm:h-32 sm:w-48">
                {r.url && r.mimeType.startsWith('image/') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.url} alt="" className="h-full w-full object-cover" />
                ) : r.url && r.mimeType.startsWith('video/') ? (
                  <video src={r.url} className="h-full w-full object-cover" muted />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-gray-500">PDF / файл</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">{r.user.displayName}</p>
                <p className="text-xs text-gray-500">
                  {r.user.email} · {r.user.activeRole ?? r.user.roles.join(', ')}
                </p>
                <p className="mt-2 text-sm text-gray-700">
                  Тип: <code className="rounded bg-gray-100 px-1">{r.type}</code>
                </p>
                <p className="text-xs text-gray-500">
                  {r.filename} · {Math.round(r.size / 1024)} КБ ·{' '}
                  {new Date(r.createdAt).toLocaleString('ru-RU')}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy === r.id}
                    onClick={() => void approve(r.id)}
                  >
                    Одобрить
                  </Button>
                  {rejectId === r.id ? (
                    <div className="w-full space-y-2">
                      <Textarea
                        placeholder="Причина отклонения (необязательно)"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="min-h-[80px]"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          disabled={busy === r.id}
                          onClick={() => void reject(r.id)}
                        >
                          Подтвердить отклонение
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setRejectId(null)}>
                          Отмена
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy === r.id}
                      onClick={() => setRejectId(r.id)}
                    >
                      Отклонить
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
