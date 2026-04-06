'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { STAFF_CATEGORIES } from '@unity/shared';
import { workerFilterSchema, type WorkerFilter } from '@/lib/filters/schemas';
import { useFilters } from '@/lib/filters/useFilters';
import { WorkerCard } from '@/components/catalog/WorkerCard';
import { useAuthStore } from '@/stores/authStore';
import { apiClient, ApiError } from '@/lib/api/client';
import { SlidersHorizontal, X, Users } from 'lucide-react';

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

function WorkersCatalog() {
  const { user, isAuthenticated } = useAuthStore();
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
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.activeRole === 'employer') {
      apiClient
        .get<{ data: { id: string }[] }>('/employer/favorites/workers')
        .then((res) => setFavoriteIds(new Set(res.data.map((w) => w.id))))
        .catch(() => {});
    }
  }, [isAuthenticated, user?.activeRole]);

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
    if (!isAuthenticated) return;
    const isFav = favoriteIds.has(workerId);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(workerId);
      else next.add(workerId);
      return next;
    });
    try {
      if (isFav) {
        await apiClient.delete(`/employer/favorites/workers/${workerId}`);
      } else {
        await apiClient.post(`/employer/favorites/workers/${workerId}`);
      }
    } catch {
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (isFav) next.add(workerId);
        else next.delete(workerId);
        return next;
      });
    }
  };

  const hasActiveFilters =
    filters.category !== undefined ||
    filters.cityId !== undefined ||
    filters.rateMin !== undefined ||
    filters.rateMax !== undefined ||
    filters.hasMedicalBook !== undefined ||
    filters.willingToTravel !== undefined;

  return (
    <div className="container-page py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Специалисты</h1>
          <p className="mt-1 text-sm text-gray-500">
            {loading ? 'Загружаем...' : `${total} специалистов`}
          </p>
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-2 rounded-input border px-4 py-2.5 text-sm font-medium transition ${
            showFilters || hasActiveFilters
              ? 'border-primary-300 bg-primary-50 text-primary-700'
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Фильтры
          {hasActiveFilters && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary-500 text-xs text-white">
              !
            </span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className="mt-4 rounded-card border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Фильтры</h3>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
              >
                <X className="h-3 w-3" />
                Сбросить все
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Категория</label>
              <select
                value={typeof filters.category === 'string' ? filters.category : ''}
                onChange={(e) => setFilters({ category: e.target.value || undefined, page: 1 })}
                className="w-full rounded-input border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">Все</option>
                {CATEGORY_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Город</label>
              <select
                value={filters.cityId ?? ''}
                onChange={(e) => setFilters({ cityId: e.target.value || undefined, page: 1 })}
                className="w-full rounded-input border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">Все города</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ставка от</label>
              <input
                type="number"
                min={0}
                value={filters.rateMin ?? ''}
                onChange={(e) => setFilters({ rateMin: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
                placeholder="0"
                className="w-full rounded-input border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ставка до</label>
              <input
                type="number"
                min={0}
                value={filters.rateMax ?? ''}
                onChange={(e) => setFilters({ rateMax: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
                placeholder="∞"
                className="w-full rounded-input border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.hasMedicalBook ?? false}
                onChange={(e) => setFilters({ hasMedicalBook: e.target.checked || undefined, page: 1 })}
                className="h-4 w-4 rounded border-gray-300 text-primary-500"
              />
              Медкнижка
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.willingToTravel ?? false}
                onChange={(e) => setFilters({ willingToTravel: e.target.checked || undefined, page: 1 })}
                className="h-4 w-4 rounded border-gray-300 text-primary-500"
              />
              Готов к выезду
            </label>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-gray-500">{total} результатов</span>
        <select
          value={`${filters.sortBy}_${filters.sortOrder}`}
          onChange={(e) => {
            const [sortBy, sortOrder] = e.target.value.split('_') as [WorkerFilter['sortBy'], WorkerFilter['sortOrder']];
            setFilters({ sortBy, sortOrder, page: 1 });
          }}
          className="rounded-input border border-gray-300 px-2 py-1.5 text-sm focus:outline-none"
        >
          <option value="rating_desc">По рейтингу</option>
          <option value="rate_desc">По ставке (убыв.)</option>
          <option value="rate_asc">По ставке (возр.)</option>
          <option value="createdAt_desc">По дате</option>
        </select>
      </div>

      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-card bg-gray-200" />
          ))}
        </div>
      ) : workers.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <Users className="h-12 w-12 text-gray-300" />
          <h3 className="font-semibold text-gray-900">Ничего не найдено</h3>
          <p className="text-sm text-gray-500">Попробуйте изменить фильтры</p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="mt-2 rounded-input bg-primary-500 px-5 py-2 text-sm font-semibold text-white"
            >
              Сбросить фильтры
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workers.map((w) => (
              <WorkerCard
                key={w.id}
                {...w}
                isAuthenticated={isAuthenticated && user?.activeRole === 'employer'}
                isFavorite={favoriteIds.has(w.id)}
                onFavoriteToggle={toggleFavorite}
              />
            ))}
          </div>
          {total > 20 && (
            <div className="mt-8 flex justify-center gap-2">
              {(filters.page ?? 1) > 1 && (
                <button
                  onClick={() => setFilters({ page: (filters.page ?? 1) - 1 })}
                  className="rounded-input border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
                >
                  Назад
                </button>
              )}
              <span className="flex items-center px-4 text-sm text-gray-500">
                Страница {filters.page ?? 1} из {Math.ceil(total / 20)}
              </span>
              {(filters.page ?? 1) < Math.ceil(total / 20) && (
                <button
                  onClick={() => setFilters({ page: (filters.page ?? 1) + 1 })}
                  className="rounded-input border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
                >
                  Вперёд
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function WorkersPage() {
  return (
    <Suspense>
      <WorkersCatalog />
    </Suspense>
  );
}
