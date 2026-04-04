'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { VACANCY_STATUSES } from '@unity/shared';
import { FileText } from 'lucide-react';

interface VacancyWithCount {
  id: string;
  title: string;
  status: string;
  _count: { applications: number };
}

export default function EmployerApplicationsPage() {
  const { toast } = useToast();
  const [vacancies, setVacancies] = useState<VacancyWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<{ data: VacancyWithCount[] }>('/employer/vacancies')
      .then((res) => setVacancies(res.data.filter((v) => v._count.applications > 0)))
      .catch(() => toast('Ошибка загрузки', 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Все отклики</h1>
      <p className="mt-1 text-sm text-gray-500">Отклики по вашим вакансиям</p>

      <div className="mt-6">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-card bg-gray-200" />
            ))}
          </div>
        ) : vacancies.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-card border border-gray-200 bg-white py-16 text-center">
            <FileText className="h-10 w-10 text-gray-300" />
            <h3 className="font-semibold text-gray-900">Откликов пока нет</h3>
          </div>
        ) : (
          <div className="space-y-3">
            {vacancies.map((v) => (
              <Link
                key={v.id}
                href={`/employer/vacancies/${v.id}/applications`}
                className="flex items-center justify-between rounded-card border border-gray-200 bg-white p-5 shadow-sm transition hover:border-primary-300 hover:shadow-card-hover"
              >
                <div>
                  <p className="font-medium text-gray-900">{v.title}</p>
                  <p className="text-xs text-gray-500">
                    {VACANCY_STATUSES[v.status as keyof typeof VACANCY_STATUSES] ?? v.status}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary-600">{v._count.applications}</p>
                  <p className="text-xs text-gray-500">откликов</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
