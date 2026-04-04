'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { type VacancyCreateInput } from '@unity/shared';
import { VacancyForm } from '@/components/forms/VacancyForm';
import { useToast } from '@/components/ui/toast-context';
import { apiClient } from '@/lib/api/client';
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

  const onSubmit = async (data: VacancyCreateInput & { status: string }) => {
    try {
      await apiClient.post('/employer/vacancies', data);
      toast('Вакансия создана', 'success');
      router.push('/employer/vacancies');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Ошибка создания', 'error');
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/employer/vacancies" className="rounded-full p-1.5 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Новая вакансия</h1>
          <p className="mt-0.5 text-sm text-gray-500">Заполните данные для публикации</p>
        </div>
      </div>
      <VacancyForm cities={cities} onSubmit={onSubmit} submitLabel="Создать вакансию" />
    </div>
  );
}
