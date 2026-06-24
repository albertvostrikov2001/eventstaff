'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { STAFF_CATEGORIES } from '@unity/shared';
import { Heart, MapPin, Briefcase } from 'lucide-react';

interface Vacancy {
  id: string;
  title: string;
  category: string;
  rate: string;
  rateType: string;
  dateStart: string;
  status: string;
  employer: {
    id: string;
    companyName: string | null;
    contactName: string | null;
    isVerified: boolean;
  };
  city: { name: string } | null;
}

export default function WorkerFavoritesPage() {
  const { toast } = useToast();
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    apiClient
      .get<{ data: Vacancy[] }>('/worker/favorites/vacancies')
      .then((res) => setVacancies(res.data))
      .catch(() => toast('Ошибка загрузки', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [toast]);

  const remove = async (id: string) => {
    setVacancies((prev) => prev.filter((v) => v.id !== id));
    try {
      await apiClient.delete(`/worker/favorites/vacancies/${id}`);
    } catch {
      toast('Ошибка удаления', 'error');
      load();
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Избранные вакансии</h1>
      <p className="mt-1 text-sm text-white/50">Вакансии, которые вы сохранили</p>

      <div className="mt-6">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-card bg-white/10" />
            ))}
          </div>
        ) : vacancies.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-card border border-white/10 bg-white/[0.04] py-16 text-center">
            <Heart className="h-10 w-10 text-white/40" />
            <h3 className="font-semibold text-white/90">Нет избранных вакансий</h3>
            <p className="text-sm text-white/50">Добавляйте вакансии в избранное при просмотре каталога</p>
            <Link
              href="/vacancies"
              className="mt-2 rounded-input bg-primary-500 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-600"
            >
              Найти вакансии
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {vacancies.map((v) => (
              <div key={v.id} className="rounded-card border border-white/10 bg-white/[0.04] p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Link href={`/vacancies/${v.id}`} className="font-semibold text-white/90 hover:text-primary-300">
                      {v.title}
                    </Link>
                    <p className="mt-0.5 text-sm text-white/50">
                      {v.employer.companyName ?? v.employer.contactName}
                      {v.employer.isVerified && (
                        <span className="ml-1 text-xs text-emerald-400">✓</span>
                      )}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/45">
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        {STAFF_CATEGORIES[v.category as keyof typeof STAFF_CATEGORIES] ?? v.category}
                      </span>
                      {v.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {v.city.name}
                        </span>
                      )}
                      <span className="font-medium text-white/70">
                        {Number(v.rate).toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => remove(v.id)}
                    className="ml-2 shrink-0 rounded-full p-1.5 text-error hover:bg-red-500/15"
                  >
                    <Heart className="h-4 w-4 fill-current" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
