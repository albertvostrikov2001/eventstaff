'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';

type Req = {
  id: string;
  role: string;
  name: string;
  phone: string;
  email: string;
  status: string;
  company: string | null;
  eventType: string | null;
  createdAt: string;
  createdBy: { id: string; email: string | null } | null;
};

const STATUSES = ['', 'NEW', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'];
const ROLES = ['', 'employer', 'worker'];

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  NEW:         { label: 'Новый',    cls: 'bg-amber-500/20 text-amber-200 border border-amber-500/40' },
  IN_PROGRESS: { label: 'В работе', cls: 'bg-blue-500/20 text-blue-200 border border-blue-500/40' },
  COMPLETED:   { label: 'Завершён', cls: 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40' },
  REJECTED:    { label: 'Отклонён', cls: 'bg-red-500/20 text-red-200 border border-red-500/40' },
};

const STATUS_SELECT_LABELS: Record<string, string> = {
  '':          'Все',
  NEW:         'Новый',
  IN_PROGRESS: 'В работе',
  COMPLETED:   'Завершён',
  REJECTED:    'Отклонён',
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status];
  if (!s) return <span className="text-white/50 text-xs">{status}</span>;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>
      {status === 'NEW' && (
        <span className="mr-1 h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
      )}
      {s.label}
    </span>
  );
}

export default function AdminIndividualRequestsPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Req[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page };
    if (status) params.status = status;
    if (role) params.role = role;
    void apiClient
      .get<{ data: Req[]; meta: typeof meta }>('/admin/individual-requests', params)
      .then((r) => {
        setRows(r.data);
        if (r.meta) setMeta(r.meta);
      })
      .catch(() => toast('Ошибка загрузки', 'error'))
      .finally(() => setLoading(false));
  }, [page, status, role, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  // Открытие списка гасит непрочитанные уведомления о заявках — колокольчик сбрасывается.
  useEffect(() => {
    void apiClient
      .post('/notifications/read-by-types', { types: ['INDIVIDUAL_REQUEST'] })
      .catch(() => {});
  }, []);

  const unreadCount = rows.filter((r) => r.status === 'NEW').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-white">Персональные запросы</h1>
        {unreadCount > 0 && (
          <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
            {unreadCount} новых
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="text-xs text-white/50">
          Роль
          <select
            className="mt-1 block w-40 rounded-input border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-white"
            value={role}
            onChange={(e) => { setRole(e.target.value); setPage(1); }}
          >
            {ROLES.map((r) => (
              <option key={r} value={r} className="bg-gray-900">
                {r || 'Все'}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-white/50">
          Статус
          <select
            className="mt-1 block w-44 rounded-input border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-white"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s} className="bg-gray-900">
                {STATUS_SELECT_LABELS[s] ?? s}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-input border border-white/10 bg-white/[0.04]">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs text-white/50">
              <th className="w-4 px-2 py-2" />
              <th className="px-3 py-2">Дата</th>
              <th className="px-3 py-2">Роль</th>
              <th className="px-3 py-2">Имя</th>
              <th className="px-3 py-2">Телефон</th>
              <th className="px-3 py-2">Тип / компания</th>
              <th className="px-3 py-2">Автор</th>
              <th className="px-3 py-2">Статус</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-white/50">
                  Загрузка…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-4">
                  <AdminEmptyState
                    icon={Inbox}
                    title="Персональных заявок нет"
                    description="Когда поступят заявки — они появятся здесь"
                  />
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((r) => {
                const isNew = r.status === 'NEW';
                return (
                  <tr
                    key={r.id}
                    className={`border-b border-white/[0.05] transition-colors ${
                      isNew
                        ? 'bg-amber-500/[0.06] hover:bg-amber-500/[0.10]'
                        : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    {/* Unread dot */}
                    <td className="px-2 py-2">
                      {isNew && (
                        <span className="block h-2 w-2 rounded-full bg-amber-400 mx-auto" />
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-white/60">
                      {new Date(r.createdAt).toLocaleString('ru-RU')}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-white/70">{r.role}</td>
                    <td className="px-3 py-2">
                      <Link
                        className={`hover:underline ${isNew ? 'font-semibold text-amber-200' : 'text-primary-300'}`}
                        href={`/admin/individual-requests/${r.id}`}
                      >
                        {r.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-xs text-white/80">{r.phone}</td>
                    <td className="px-3 py-2 text-xs text-white/70">
                      {r.eventType || r.company || '—'}
                    </td>
                    <td className="px-3 py-2 text-[11px]">
                      {!r.createdBy ? (
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-amber-100">
                          Незарегистрированный
                        </span>
                      ) : (
                        <span className="text-white/65">{r.createdBy.email ?? r.createdBy.id}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                );
              })}
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
    </div>
  );
}
