'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { APPLICATION_STATUSES } from '@unity/shared';

interface ApplicationItem {
  id: string;
  status: string;
  createdAt: string;
  vacancy: { title: string; employer: { companyName: string | null; contactName: string | null } };
  worker: { firstName: string; lastName: string; photoUrl: string | null };
}

export default function AdminApplicationsPage() {
  const { toast } = useToast();
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string | number | undefined> = {
      ...(statusFilter ? { status: statusFilter } : {}),
    };
    apiClient
      .get<{ data: ApplicationItem[]; meta: { total: number } }>('/admin/applications', params)
      .then((res) => {
        setApplications(res.data);
        setTotal(res.meta?.total ?? 0);
      })
      .catch(() => toast('Ошибка загрузки', 'error'))
      .finally(() => setLoading(false));
  }, [statusFilter, toast]);

  const STATUS_OPTIONS = ['', 'pending', 'confirmed', 'rejected', 'invited'];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Отклики</h1>
      <div className="mt-4 flex gap-1 flex-wrap">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              statusFilter === s
                ? 'bg-primary-500 text-white'
                : 'border border-gray-200 bg-white text-gray-600'
            }`}
          >
            {s ? (APPLICATION_STATUSES[s as keyof typeof APPLICATION_STATUSES] ?? s) : 'Все'}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-card border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Специалист</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Вакансия</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Работодатель</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Статус</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Дата</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(5)].map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              applications.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {a.worker.firstName} {a.worker.lastName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{a.vacancy.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {a.vacancy.employer.companyName ?? a.vacancy.employer.contactName ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-badge px-2 py-0.5 text-xs font-medium ${
                      a.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      a.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                      a.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {APPLICATION_STATUSES[a.status as keyof typeof APPLICATION_STATUSES] ?? a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(a.createdAt).toLocaleDateString('ru-RU')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-3 text-sm text-gray-500">{total} откликов</div>
    </div>
  );
}
