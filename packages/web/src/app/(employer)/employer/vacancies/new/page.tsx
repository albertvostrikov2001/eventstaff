'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { type VacancyCreateInput } from '@unity/shared';
import { VacancyForm } from '@/components/forms/VacancyForm';
import { useToast } from '@/components/ui/toast-context';
import { ApiError, apiClient } from '@/lib/api/client';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface City { id: string; name: string }

export default function NewVacancyPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [cities, setCities] = useState<City[]>([]);

  useEffect(() => {
    apiClient.get<{ data: City[] }>('/catalog/cities').then((res) => setCities(res.data)).catch(() => {});
  }, []);

  const onSubmit = async (data: VacancyCreateInput) => {
    try {
      const res = await apiClient.post<{ data: { id: string } }>('/employer/vacancies', data);
      toast('Вакансия создана', 'success');
      router.push(`/employer/vacancies/${res.data.id}`);
    } catch (err: unknown) {
      toast(err instanceof ApiError ? err.message : 'Ошибка создания', 'error');
    }
  };

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/employer/vacancies"
            className="mt-1 rounded-full p-2 text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Новая вакансия</h1>
            <p className="mt-1 text-sm text-white/55">Заполните данные для публикации или черновика</p>
          </div>
        </div>
      </div>
      <VacancyForm cities={cities} mode="create" onSubmit={onSubmit} />
    </div>
  );
}
