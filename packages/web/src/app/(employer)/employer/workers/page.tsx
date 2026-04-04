'use client';

import { useEffect, useState, Suspense } from 'react';
import { STAFF_CATEGORIES } from '@unity/shared';
import { WorkerCard } from '@/components/catalog/WorkerCard';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { workerFilterSchema, type WorkerFilter } from '@/lib/filters/schemas';
import { useFilters } from '@/lib/filters/useFilters';
import { SlidersHorizontal, X } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

interface WorkerProfile {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  categories: { category: string; level: string }[];
  city: { id: string; name: string } | null;
  desiredRate: string | null;
  rateType: string | null;
  experienceYears: number;
  ratingScore: string;
  hasMedicalBook: boolean;
  willingToTravel: boolean;
}

interface City { id: string; name: string }

const DEFAULTS: Partial<WorkerFilter> = { sortBy: 'rating', sortOrder: 'desc', page: 1 };
const CATEGORY_OPTIONS = Object.entries(STAFF_CATEGORIES);

function EmployerWorkersContent() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const { filters, setFilters, resetFilters } = useFilters(workerFilterSchema, DEFAULTS);
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetch(`${API}/catalog/cities`, { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => setCities(j.data ?? []))
      .catch(() => {});
    apiClient
      .get<{ data: { id: string }[] }>('/employer/favorites/workers')
      .then((res) => setFavoriteIds(new Set(res.data.map((w) => w.id))))
      .catch(() => {});
  }, []);

  const params: Record<string, unknown> = {
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.cityId ? { cityId: filters.cityId } : {}),
    ...(filters.rateMin !== undefined ? { rateMin: filters.rateMin } : {}),
    ...(filters.rateMax !== undefined ? { rateMax: filters.rateMax } : {}),
    ...(filters.hasMedicalBook !== undefined ? { hasMedicalBook: filters.hasMedicalBook } : {}),
    ...(filters.willingToTravel !== undefined ? { willingToTravel: filters.willingToTravel } : {}),
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    page: filters.page,
    limit: 20,
  };

  useEffect(() => {
    setLoading(true);
    const searchParams = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) {
        if (Array.isArray(v)) v.forEach((x) => searchParams.append(k, String(x)));
        else searchParams.set(k, String(v));
      }
    }
    fetch(`${API}/catalog/workers?${searchParams}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => {
        setWorkers(j.data ?? []);
        setTotal(j.meta?.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [JSON.stringify(params)]);

  const toggleFavorite = async (workerId: string) => {
    const isFav = favoriteIds.has(workerId);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(workerId);
      else next.add(workerId);
      return next;
    });
    try {
      if (isFav) await apiClient.delete(`/employer/favorites/workers/${workerId}`);
      else await apiClient.post(`/employer/favorites/workers/${workerId}`);
    } catch {
      toast('Ошибка обновления избранного', 'error');
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (isFav) next.add(workerId);
        else next.delete(workerId);
        return next;
      });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Найти персонал</h1>
          <p className="mt-1 text-sm text-gray-500">{total} специалистов доступно</p>
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="flex items-center gap-2 rounded-input border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium hover:bg-gray-50"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Фильтры
        </button>
      </div>

      {showFilters && (
        <div className="mt-4 rounded-card border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Фильтры</h3>
            <button onClick={resetFilters} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
              <X className="h-3 w-3" /> Сбросить
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Категория</label>
              <select
                value={typeof filters.category === 'string' ? filters.category : ''}
                onChange={(e) => setFilters({ category: e.target.value || undefined, page: 1 })}
                className="w-full rounded-input border border-gray-300 px-2 py-1.5 text-sm focus:outline-none"
              >
                <option value="">Все</option>
                {CATEGORY_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Город</label>
              <select
                value={filters.cityId ?? ''}
                onChange={(e) => setFilters({ cityId: e.target.value || undefined, page: 1 })}
                className="w-full rounded-input border border-gray-300 px-2 py-1.5 text-sm focus:outline-none"
              >
                <option value="">Все города</option>
                {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ставка от</label>
              <input
                type="number" min={0} value={filters.rateMin ?? ''}
                onChange={(e) => setFilters({ rateMin: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
                className="w-full rounded-input border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ставка до</label>
              <input
                type="number" min={0} value={filters.rateMax ?? ''}
                onChange={(e) => setFilters({ rateMax: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
                className="w-full rounded-input border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? [...Array(6)].map((_, i) => <div key={i} className="h-52 animate-pulse rounded-card bg-gray-200" />)
          : workers.map((w) => (
              <WorkerCard
                key={w.id}
                {...w}
                isAuthenticated
                isFavorite={favoriteIds.has(w.id)}
                onFavoriteToggle={toggleFavorite}
              />
            ))}
      </div>
    </div>
  );
}

export default function EmployerWorkersPage() {
  return (
    <Suspense>
      <EmployerWorkersContent />
    </Suspense>
  );
}
