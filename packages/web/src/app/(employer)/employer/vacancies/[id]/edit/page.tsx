'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { type VacancyCreateInput } from '@unity/shared';
import { VacancyForm } from '@/components/forms/VacancyForm';
import { useToast } from '@/components/ui/toast-context';
import { apiClient } from '@/lib/api/client';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface City { id: string; name: string }
interface Vacancy {
  id: string;
  title: string;
  category: string;
  description: string | null;
  rate: string;
  rateType: string;
  employmentType: string;
  eventType: string | null;
  dateStart: string;
  dateEnd: string | null;
  workersNeeded: number;
  responsibilities: string | null;
  requirements: string | null;
  conditions: string | null;
  foodProvided: boolean;
  transportProvided: boolean;
  isUrgent: boolean;
  cityId: string | null;
  status: string;
}

export default function EditVacancyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [cities, setCities] = useState<City[]>([]);
  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get<{ data: Vacancy }>(`/employer/vacancies/${id}`),
      apiClient.get<{ data: City[] }>('/catalog/cities'),
    ])
      .then(([vacRes, citiesRes]) => {
        setVacancy(vacRes.data);
        setCities(citiesRes.data);
      })
      .catch(() => toast('Ошибка загрузки', 'error'))
      .finally(() => setLoading(false));
  }, [id, toast]);

  const onSubmit = async (data: VacancyCreateInput & { status: string }) => {
    try {
      await apiClient.put(`/employer/vacancies/${id}`, data);
      toast('Вакансия обновлена', 'success');
      router.push('/employer/vacancies');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Ошибка обновления', 'error');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-card bg-gray-200" />
        ))}
      </div>
    );
  }

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}T${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/employer/vacancies" className="rounded-full p-1.5 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Редактировать вакансию</h1>
          <p className="mt-0.5 text-sm text-gray-500">{vacancy?.title}</p>
        </div>
      </div>
      {vacancy && (
        <VacancyForm
          cities={cities}
          defaultValues={{
            title: vacancy.title,
            category: vacancy.category as VacancyCreateInput['category'],
            description: vacancy.description ?? undefined,
            rate: Number(vacancy.rate),
            rateType: vacancy.rateType as VacancyCreateInput['rateType'],
            employmentType: vacancy.employmentType as VacancyCreateInput['employmentType'],
            eventType: vacancy.eventType as VacancyCreateInput['eventType'],
            dateStart: formatDate(vacancy.dateStart),
            dateEnd: vacancy.dateEnd ? formatDate(vacancy.dateEnd) : undefined,
            workersNeeded: vacancy.workersNeeded,
            responsibilities: vacancy.responsibilities ?? undefined,
            requirements: vacancy.requirements ?? undefined,
            conditions: vacancy.conditions ?? undefined,
            foodProvided: vacancy.foodProvided,
            transportProvided: vacancy.transportProvided,
            isUrgent: vacancy.isUrgent,
            cityId: vacancy.cityId ?? undefined,
            status: vacancy.status,
          }}
          onSubmit={onSubmit}
          submitLabel="Сохранить изменения"
        />
      )}
    </div>
  );
}
