'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { type VacancyCreateInput } from '@unity/shared';
import { VacancyForm } from '@/components/forms/VacancyForm';
import { useToast } from '@/components/ui/toast-context';
import { ApiError, apiClient } from '@/lib/api/client';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface City {
  id: string;
  name: string;
}

function parseTags(t: unknown): string[] {
  if (!Array.isArray(t)) return [];
  return t.filter((x): x is string => typeof x === 'string');
}

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
  tags?: unknown;
  coverImageUrl?: string | null;
}

export function EditVacancyPageClient() {
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

  const onSubmit = async (data: VacancyCreateInput) => {
    try {
      const { status, ...body } = data;
      void status;
      await apiClient.put(`/employer/vacancies/${id}`, body);
      toast('Вакансия обновлена', 'success');
      router.push(`/employer/vacancies/${id}`);
    } catch (err: unknown) {
      toast(err instanceof ApiError ? err.message : 'Ошибка обновления', 'error');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-[14px] border border-white/[0.06] bg-white/[0.06]"
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <Link
            href={`/employer/vacancies/${id}`}
            className="mt-1 rounded-full p-2 text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Редактировать вакансию</h1>
            <p className="mt-1 text-sm text-white/55">{vacancy?.title}</p>
          </div>
        </div>
      </div>
      {vacancy && (
        <VacancyForm
          mode="edit"
          cities={cities}
          defaultValues={{
            title: vacancy.title,
            category: vacancy.category as VacancyCreateInput['category'],
            description: vacancy.description ?? undefined,
            rate: Number(vacancy.rate),
            rateType: vacancy.rateType as VacancyCreateInput['rateType'],
            employmentType: vacancy.employmentType as VacancyCreateInput['employmentType'],
            eventType: vacancy.eventType as VacancyCreateInput['eventType'],
            dateStart: new Date(vacancy.dateStart).toISOString(),
            dateEnd: vacancy.dateEnd ? new Date(vacancy.dateEnd).toISOString() : '',
            workersNeeded: vacancy.workersNeeded,
            responsibilities: vacancy.responsibilities ?? undefined,
            requirements: vacancy.requirements ?? undefined,
            conditions: vacancy.conditions ?? undefined,
            foodProvided: vacancy.foodProvided,
            transportProvided: vacancy.transportProvided,
            isUrgent: vacancy.isUrgent,
            cityId: vacancy.cityId ?? undefined,
            status: vacancy.status as VacancyCreateInput['status'],
            tags: parseTags(vacancy.tags),
            coverImageUrl: vacancy.coverImageUrl?.trim() ? vacancy.coverImageUrl : '',
          }}
          onSubmit={onSubmit}
          submitLabel="Сохранить изменения"
        />
      )}
    </div>
  );
}
