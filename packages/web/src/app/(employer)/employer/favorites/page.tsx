'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { STAFF_CATEGORIES } from '@unity/shared';
import { Heart, MapPin, User } from 'lucide-react';

interface Worker {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  desiredRate: string | null;
  experienceYears: number;
  city: { name: string } | null;
  categories: { category: string }[];
}

export default function EmployerFavoritesPage() {
  const { toast } = useToast();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    apiClient
      .get<{ data: Worker[] }>('/employer/favorites/workers')
      .then((res) => setWorkers(res.data))
      .catch(() => toast('Ошибка загрузки', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const remove = async (id: string) => {
    setWorkers((prev) => prev.filter((w) => w.id !== id));
    try {
      await apiClient.delete(`/employer/favorites/workers/${id}`);
    } catch {
      toast('Ошибка удаления', 'error');
      load();
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Избранные специалисты</h1>
      <p className="mt-1 text-sm text-gray-500">Сохранённые кандидаты</p>

      <div className="mt-6">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-card bg-gray-200" />
            ))}
          </div>
        ) : workers.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-card border border-gray-200 bg-white py-16 text-center">
            <Heart className="h-10 w-10 text-gray-300" />
            <h3 className="font-semibold text-gray-900">Нет избранных</h3>
            <p className="text-sm text-gray-500">Добавляйте специалистов при просмотре каталога</p>
            <Link
              href="/employer/workers"
              className="mt-2 rounded-input bg-primary-500 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-600"
            >
              Найти специалистов
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {workers.map((w) => (
              <div key={w.id} className="rounded-card border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                      <User className="h-6 w-6 text-gray-400" />
                    </div>
                    <div>
                      <Link href={`/workers/${w.id}`} className="font-semibold text-gray-900 hover:text-primary-600">
                        {w.firstName} {w.lastName}
                      </Link>
                      <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-gray-500">
                        {w.categories[0] && (
                          <span>{STAFF_CATEGORIES[w.categories[0].category as keyof typeof STAFF_CATEGORIES] ?? w.categories[0].category}</span>
                        )}
                        {w.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />{w.city.name}
                          </span>
                        )}
                        {w.desiredRate && (
                          <span>{Number(w.desiredRate).toLocaleString('ru-RU')} ₽/ч</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => remove(w.id)}
                    className="shrink-0 rounded-full p-1.5 text-error hover:bg-red-50"
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
