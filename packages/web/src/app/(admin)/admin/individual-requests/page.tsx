'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
};

const STATUSES = ['', 'NEW', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'];
const ROLES = ['', 'employer', 'worker'];

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Персональные запросы</h1>
      <div className="flex flex-wrap gap-3">
        <label className="text-xs text-white/50">
          Роль
          <select
            className="mt-1 block w-40 rounded-input border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-white"
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
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
      </div>
      <div className="overflow-x-auto rounded-input border border-white/10 bg-white/[0.04]">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs text-white/50">
              <th className="px-3 py-2">Дата</th>
              <th className="px-3 py-2">Роль</th>
              <th className="px-3 py-2">Имя</th>
              <th className="px-3 py-2">Телефон</th>
              <th className="px-3 py-2">Тип / компания</th>
              <th className="px-3 py-2">Статус</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-white/50">
                  Загрузка…
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((r) => (
                <tr key={r.id} className="border-b border-white/[0.05] text-white/90">
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-white/60">
                    {new Date(r.createdAt).toLocaleString('ru-RU')}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{r.role}</td>
                  <td className="px-3 py-2">
                    <Link
                      className="text-primary-300 hover:underline"
                      href={`/admin/individual-requests/${r.id}`}
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-xs">{r.phone}</td>
                  <td className="px-3 py-2 text-xs text-white/70">
                    {r.eventType || r.company || '—'}
                  </td>
                  <td className="px-3 py-2">{r.status}</td>
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
    </div>
  );
}
