'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import {
  Send,
  User,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface Invitation {
  id: string;
  status: string;
  createdAt: string;
  vacancy: { id: string; title: string; dateStart?: string | null };
  worker: { id: string; firstName: string; lastName: string; photoUrl: string | null };
}

interface Meta {
  total: number;
  page: number;
  totalPages: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  invited: { label: 'Ожидает ответа', color: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'Принято', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Отклонено', color: 'bg-red-100 text-red-600' },
  pending: { label: 'Ожидает', color: 'bg-gray-100 text-gray-600' },
};

export default function EmployerInvitationsPage() {
  const { toast } = useToast();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    apiClient
      .get<{ data: Invitation[]; meta: Meta }>('/employer/invitations', { page })
      .then((r) => {
        setInvitations(r.data ?? []);
        if (r.meta) setMeta(r.meta);
      })
      .catch(() => toast('Ошибка загрузки приглашений', 'error'))
      .finally(() => setLoading(false));
  }, [page, toast]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Отправленные приглашения</h1>
      <p className="mt-1 text-sm text-gray-500">
        История прямых приглашений работников на ваши вакансии
      </p>

      <div className="mt-6">
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-card border border-gray-200 bg-gray-50" />
            ))}
          </div>
        ) : invitations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Send className="mb-4 h-12 w-12 text-gray-200" />
            <p className="text-sm text-gray-500">Вы ещё не отправляли приглашений</p>
            <p className="mt-1 text-xs text-gray-400">
              Перейдите в раздел «Найти персонал», чтобы пригласить работника
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-card border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Работник</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Вакансия</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Дата</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Статус</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Отправлено</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invitations.map((inv) => {
                  const st = STATUS_CONFIG[inv.status] ?? { label: inv.status, color: 'bg-gray-100 text-gray-600' };
                  const workerName = `${inv.worker.firstName} ${inv.worker.lastName}`.trim() || 'Работник';
                  const dateStr = inv.vacancy.dateStart
                    ? new Date(inv.vacancy.dateStart).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
                    : '—';
                  const sentStr = new Date(inv.createdAt).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'short',
                  });

                  return (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {inv.worker.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={inv.worker.photoUrl}
                              alt=""
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                              <User className="h-4 w-4 text-gray-400" />
                            </div>
                          )}
                          <span className="font-medium text-gray-900">{workerName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{inv.vacancy.title}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-gray-500">
                          <Calendar className="h-3.5 w-3.5" /> {dateStr}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-badge px-2.5 py-0.5 text-xs font-medium ${st.color}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{sentStr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {meta.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-gray-500">{meta.total} приглашений</span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-full p-1.5 hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-500">{page} / {meta.totalPages}</span>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-full p-1.5 hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
