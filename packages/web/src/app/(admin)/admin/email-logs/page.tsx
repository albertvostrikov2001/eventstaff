'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient, ApiError } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface EmailLogRow {
  id: string;
  to: string;
  type: string;
  status: string;
  errorText: string | null;
  createdAt: string;
  subject: string;
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function maskTo(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0) return '—';
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  return `${local.slice(0, 2)}***@${domain}`;
}

export default function AdminEmailLogsPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<EmailLogRow[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('');
  const [type, setType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [retrying, setRetrying] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ data: EmailLogRow[]; meta: Meta }>('/admin/email-logs', {
        page,
        ...(status ? { status } : {}),
        ...(type.trim() ? { type: type.trim() } : {}),
        ...(dateFrom ? { dateFrom: `${dateFrom}T00:00:00.000Z` } : {}),
        ...(dateTo ? { dateTo: `${dateTo}T23:59:59.999Z` } : {}),
      });
      setRows(res.data);
      setMeta(res.meta);
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        toast('Нет доступа', 'error');
      } else {
        toast('Не удалось загрузить логи', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [page, status, type, dateFrom, dateTo, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const retry = async (id: string) => {
    setRetrying(id);
    try {
      await apiClient.post(`/admin/email-logs/${id}/retry`);
      toast('Письмо поставлено в очередь', 'success');
      await load();
    } catch {
      toast('Не удалось повторить отправку', 'error');
    } finally {
      setRetrying(null);
    }
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-gray-900">Журнал email</h1>
      <p className="mt-1 text-sm text-gray-600">Отправки через Resend, статусы и ошибки.</p>

      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-card border border-gray-200 bg-white p-4">
        <div>
          <label className="text-xs font-medium text-gray-500">Статус</label>
          <select
            className="mt-1 block w-40 rounded-md border border-gray-300 px-2 py-2 text-sm"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
          >
            <option value="">Все</option>
            <option value="PENDING">PENDING</option>
            <option value="SENT">SENT</option>
            <option value="FAILED">FAILED</option>
            <option value="BOUNCED">BOUNCED</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">Тип (enum)</label>
          <Input
            className="mt-1 w-48"
            placeholder="APPLICATION_RECEIVED"
            value={type}
            onChange={(e) => {
              setPage(1);
              setType(e.target.value);
            }}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">Дата с</label>
          <Input
            type="date"
            className="mt-1 w-40"
            value={dateFrom}
            onChange={(e) => {
              setPage(1);
              setDateFrom(e.target.value);
            }}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">Дата по</label>
          <Input
            type="date"
            className="mt-1 w-40"
            value={dateTo}
            onChange={(e) => {
              setPage(1);
              setDateTo(e.target.value);
            }}
          />
        </div>
        <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
          Обновить
        </Button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-card border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Дата</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Получатель</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Тип</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Статус</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Ошибка</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Загрузка…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Записей нет
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                    {new Date(r.createdAt).toLocaleString('ru-RU')}
                  </td>
                  <td className="px-4 py-3 text-gray-800">{maskTo(r.to)}</td>
                  <td className="px-4 py-3 text-gray-700">{r.type}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.status === 'SENT'
                          ? 'bg-green-100 text-green-800'
                          : r.status === 'FAILED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-gray-600" title={r.errorText ?? ''}>
                    {r.errorText ?? '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {r.status === 'FAILED' ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={retrying === r.id}
                        onClick={() => void retry(r.id)}
                      >
                        {retrying === r.id ? '…' : 'Retry'}
                      </Button>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {meta && meta.totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>
            Стр. {meta.page} из {meta.totalPages} ({meta.total} записей)
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Назад
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Вперёд
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
