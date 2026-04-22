'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient, ApiError } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Complaint = {
  id: string;
  type: string;
  status: string;
  targetType: string;
  targetId: string;
  description: string;
  createdAt: string;
  author?: { id: string; email: string | null; activeRole: string | null };
  history?: { id: string; action: string; comment: string | null; newStatus: string | null; createdAt: string }[];
};

const STATUSES = ['', 'NEW', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'NEEDS_CLARIFICATION'];
const TYPES = ['', 'USER', 'MESSAGE', 'VACANCY', 'ORDER', 'CANCELLATION', 'NON_PAYMENT', 'NO_SHOW'];

export default function AdminComplaintsPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Complaint[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState<Complaint | null>(null);
  const [newStatus, setNewStatus] = useState('IN_PROGRESS');
  const [comment, setComment] = useState('');
  const [sanction, setSanction] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page };
    if (status) params.status = status;
    if (type) params.type = type;
    void apiClient
      .get<{ data: Complaint[]; meta: typeof meta }>('/admin/complaints', params)
      .then((r) => {
        setRows(r.data);
        setMeta(r.meta!);
      })
      .catch(() => toast('Ошибка загрузки', 'error'))
      .finally(() => setLoading(false));
  }, [page, status, type, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const open = async (c: Complaint) => {
    setSel(c);
    setNewStatus(c.status);
    setComment('');
    setSanction(false);
    try {
      const d = await apiClient.get<{ data: Complaint }>(`/admin/complaints/${c.id}`);
      setSel(d.data);
    } catch {
      /* keep list row */
    }
  };

  const saveStatus = async () => {
    if (!sel) return;
    setSaving(true);
    try {
      await apiClient.patch(`/admin/complaints/${sel.id}/status`, {
        status: newStatus,
        comment: comment || undefined,
        sanction: sanction || undefined,
      });
      toast('Статус обновлён', 'success');
      void load();
      const d = await apiClient.get<{ data: Complaint }>(`/admin/complaints/${sel.id}`);
      setSel(d.data);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Ошибка', 'error');
    } finally {
      setSaving(false);
    }
  };

  const banTarget = async (userId: string) => {
    if (!window.confirm('Заблокировать пользователя?')) return;
    try {
      await apiClient.patch(`/admin/users/${userId}/ban`, {});
      toast('Пользователь заблокирован', 'success');
    } catch {
      toast('Ошибка', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Жалобы</h1>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs uppercase tracking-wide text-white/50">
          Статус
          <select
            className="mt-1 block w-44 rounded-input border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-white"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s} className="bg-gray-900">
                {s || 'Все'}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs uppercase tracking-wide text-white/50">
          Тип
          <select
            className="mt-1 block w-44 rounded-input border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-white"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
          >
            {TYPES.map((t) => (
              <option key={t} value={t} className="bg-gray-900">
                {t || 'Все'}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-input border border-white/10 bg-white/[0.04]">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs font-medium uppercase text-white/50">
              <th className="px-3 py-2">Дата</th>
              <th className="px-3 py-2">Тип</th>
              <th className="px-3 py-2">Статус</th>
              <th className="px-3 py-2">Автор</th>
              <th className="px-3 py-2">Цель</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-white/50">
                  Загрузка…
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((c) => (
                <tr
                  key={c.id}
                  className="cursor-pointer border-b border-white/[0.05] text-white/90 hover:bg-white/[0.03]"
                  onClick={() => void open(c)}
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    {new Date(c.createdAt).toLocaleString('ru-RU')}
                  </td>
                  <td className="px-3 py-2">{c.type}</td>
                  <td className="px-3 py-2">{c.status}</td>
                  <td className="px-3 py-2 text-xs text-white/70">{c.author?.email ?? c.author?.id}</td>
                  <td className="px-3 py-2 text-xs">
                    {c.targetType} / {c.targetId.slice(0, 8)}…
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-2 text-sm text-white/70">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="rounded p-1 hover:bg-white/10 disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span>
          {page} / {meta.totalPages || 1}
        </span>
        <button
          type="button"
          disabled={page >= (meta.totalPages || 1)}
          onClick={() => setPage((p) => p + 1)}
          className="rounded p-1 hover:bg-white/10 disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {sel && (
        <div className="rounded-input border border-white/10 bg-white/[0.04] p-4 text-sm text-white/90">
          <h2 className="text-lg font-semibold text-white">Жалоба {sel.id.slice(0, 8)}</h2>
          <p className="mt-2 whitespace-pre-wrap text-white/80">{sel.description}</p>
          {sel.history && sel.history.length > 0 && (
            <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
              <h3 className="text-xs font-medium uppercase text-white/50">История</h3>
              {sel.history.map((h) => (
                <div key={h.id} className="text-xs text-white/60">
                  {new Date(h.createdAt).toLocaleString('ru-RU')}: {h.newStatus} {h.comment}
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 space-y-2">
            <label className="block text-xs text-white/50">Новый статус</label>
            <select
              className="w-full max-w-xs rounded-input border border-white/15 bg-white/5 px-2 py-1.5 text-white"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
            >
              {STATUSES.filter(Boolean).map((s) => (
                <option key={s} value={s} className="bg-gray-900">
                  {s}
                </option>
              ))}
            </select>
            <label className="mt-2 block text-xs text-white/50">Комментарий</label>
            <textarea
              className="w-full rounded-input border border-white/15 bg-white/5 px-2 py-1.5 text-white"
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <label className="mt-1 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={sanction} onChange={(e) => setSanction(e.target.checked)} />
              Санкция (страйк цели USER)
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveStatus()}
                className="rounded-input bg-primary-500 px-3 py-1.5 text-sm font-medium text-white"
              >
                {saving ? '…' : 'Сохранить'}
              </button>
              {sel.targetType === 'USER' && (
                <button
                  type="button"
                  onClick={() => void banTarget(sel.targetId)}
                  className="rounded-input border border-red-500/50 px-3 py-1.5 text-sm text-red-200"
                >
                  Забанить пользователя
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
