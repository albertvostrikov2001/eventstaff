'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { STAFF_CATEGORIES, VACANCY_STATUSES } from '@unity/shared';
import { MapPin, Eye, EyeOff } from 'lucide-react';

interface VacancyItem {
  id: string;
  title: string;
  category: string;
  status: string;
  isHidden: boolean;
  createdAt: string;
  city: { name: string } | null;
  employer: { companyName: string | null; contactName: string | null; isVerified: boolean };
  _count: { applications: number };
}

const STATUS_OPTIONS = ['', 'active', 'draft', 'archived', 'pending_moderation'];

export default function AdminVacanciesPage() {
  const { toast } = useToast();
  const [vacancies, setVacancies] = useState<VacancyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string | number | undefined> = {
      page,
      ...(statusFilter ? { status: statusFilter } : {}),
    };
    apiClient
      .get<{ data: VacancyItem[]; meta: { total: number } }>('/admin/vacancies', params)
      .then((res) => {
        setVacancies(res.data);
        setTotal(res.meta?.total ?? 0);
      })
      .catch(() => toast('Ошибка загрузки', 'error'))
      .finally(() => setLoading(false));
  }, [statusFilter, page, toast]);

  const toggleHidden = async (v: VacancyItem) => {
    const next = !v.isHidden;
    setTogglingId(v.id);
    try {
      await apiClient.patch(`/admin/vacancies/${v.id}/visibility`, { isHidden: next });
      setVacancies((prev) => prev.map((x) => (x.id === v.id ? { ...x, isHidden: next } : x)));
      toast(next ? 'Вакансия скрыта из каталога' : 'Вакансия снова видна', 'success');
    } catch {
      toast('Не удалось изменить видимость', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Вакансии</h1>
      <div className="mt-4 flex gap-1 flex-wrap">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              statusFilter === s
                ? 'bg-primary-500 text-white'
                : 'border border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            {s ? (VACANCY_STATUSES[s as keyof typeof VACANCY_STATUSES] ?? s) : 'Все'}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-card border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Вакансия</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Работодатель</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Категория</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Статус</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Отклики</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Дата</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(7)].map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              vacancies.map((v) => (
                <tr key={v.id} className={`hover:bg-gray-50 ${v.isHidden ? 'bg-gray-50/80' : ''}`}>
                  <td className="px-4 py-3">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-medium text-gray-900">
                        <span className={v.isHidden ? 'text-gray-400 line-through' : ''}>{v.title}</span>
                        {v.isHidden && (
                          <span className="rounded-badge bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                            Скрыта
                          </span>
                        )}
                      </p>
                      {v.city && (
                        <p className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPin className="h-3 w-3" />{v.city.name}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {v.employer.companyName ?? v.employer.contactName ?? '—'}
                    {v.employer.isVerified && <span className="ml-1 text-xs text-primary-600">✓</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {STAFF_CATEGORIES[v.category as keyof typeof STAFF_CATEGORIES] ?? v.category}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-badge px-2 py-0.5 text-xs font-medium ${
                      v.status === 'active' ? 'bg-green-100 text-green-700' :
                      v.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {VACANCY_STATUSES[v.status as keyof typeof VACANCY_STATUSES] ?? v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{v._count.applications}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(v.createdAt).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleHidden(v)}
                      disabled={togglingId === v.id}
                      className={`inline-flex items-center gap-1.5 rounded-input border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                        v.isHidden
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {v.isHidden ? (
                        <><Eye className="h-3.5 w-3.5" />Показать</>
                      ) : (
                        <><EyeOff className="h-3.5 w-3.5" />Скрыть</>
                      )}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-3 text-sm text-gray-500">{total} вакансий</div>
    </div>
  );
}
