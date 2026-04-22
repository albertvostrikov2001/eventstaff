'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Row = {
  id: string;
  adminId: string;
  action: string;
  entityType: string;
  entityId: string;
  details: unknown;
  createdAt: string;
  admin: { id: string; email: string | null } | null;
};

export default function AdminAuditLogPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [adminId, setAdminId] = useState('');
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page };
    if (action.trim()) params.action = action.trim();
    if (adminId.trim()) params.adminId = adminId.trim();
    void apiClient
      .get<{ data: Row[]; meta: typeof meta }>('/admin/audit-log', params)
      .then((r) => {
        setRows(r.data);
        if (r.meta) setMeta(r.meta);
      })
      .catch(() => toast('Ошибка загрузки', 'error'))
      .finally(() => setLoading(false));
  }, [page, action, adminId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Журнал действий</h1>
      <div className="flex flex-wrap gap-2">
        <input
          placeholder="Тип действия (фильтр)"
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          className="w-64 rounded-input border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-white placeholder:text-white/30"
        />
        <input
          placeholder="ID администратора"
          value={adminId}
          onChange={(e) => {
            setAdminId(e.target.value);
            setPage(1);
          }}
          className="w-64 rounded-input border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-white placeholder:text-white/30"
        />
      </div>
      <div className="overflow-x-auto rounded-input border border-white/10 bg-white/[0.04]">
        <table className="w-full min-w-[900px] text-left text-sm text-white/90">
          <thead>
            <tr className="border-b border-white/10 text-xs text-white/50">
              <th className="px-2 py-2">Дата</th>
              <th className="px-2 py-2">Администратор</th>
              <th className="px-2 py-2">Действие</th>
              <th className="px-2 py-2">Сущность</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-2 py-6 text-white/50">
                  Загрузка…
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((r) => (
                <tr key={r.id} className="border-b border-white/[0.05]">
                  <td className="px-2 py-1.5 text-xs text-white/60 whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleString('ru-RU')}
                  </td>
                  <td className="px-2 py-1.5 text-xs">{r.admin?.email ?? r.adminId}</td>
                  <td className="px-2 py-1.5 font-mono text-xs">{r.action}</td>
                  <td className="px-2 py-1.5 text-xs">
                    {r.entityType} / {r.entityId.slice(0, 8)}…
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <button
                      type="button"
                      onClick={() => setOpenId(openId === r.id ? null : r.id)}
                      className="text-xs text-primary-300 hover:underline"
                    >
                      {openId === r.id ? 'Скрыть' : 'JSON'}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {openId && (
          <pre className="max-h-64 overflow-auto border-t border-white/10 p-3 text-left text-xs text-white/80">
            {JSON.stringify(
              rows.find((x) => x.id === openId)?.details ?? null,
              null,
              2,
            )}
          </pre>
        )}
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
