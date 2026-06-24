'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { STAFF_CATEGORIES } from '@unity/shared';
import { workerFilterSchema, type WorkerFilter } from '@/lib/filters/schemas';
import { useFilters } from '@/lib/filters/useFilters';
import { WorkerCard } from '@/components/catalog/WorkerCard';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useAuthStore } from '@/stores/authStore';
import { apiClient, ApiError } from '@/lib/api/client';
import { SlidersHorizontal, X, Users, RotateCcw, Search, AlertCircle } from 'lucide-react';
import { WorkerCardSkeleton } from '@/components/catalog/WorkerCardSkeleton';
import { config } from '@/lib/config';
import { Button } from '@/components/ui/button';

const API = config.apiUrl;

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
  isPremium?: boolean;
  isBoosted?: boolean;
  isRecommended?: boolean;
}

interface City { id: string; name: string }

const DEFAULTS: Partial<WorkerFilter> = { sortBy: 'rating', sortOrder: 'desc', page: 1 };
const CATEGORY_OPTIONS = Object.entries(STAFF_CATEGORIES);

const SELECT_CLASS =
  'w-full rounded-input border border-white/15 bg-white/[0.06] px-2 py-1.5 text-sm text-white/90 [color-scheme:dark] focus:outline-none focus:border-emerald-500/50';

function WorkersCatalog() {
  const { user, isAuthenticated } = useAuthStore();
  const { filters, setFilters, resetFilters } = useFilters(workerFilterSchema, DEFAULTS);
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [meta, setMeta] = useState<{ upgradeRequired?: boolean; hiddenCount?: number } | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
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

  const fetchWorkers = () => {
    setLoading(true);
    setError(false);
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
        setMeta({
          upgradeRequired: j.meta?.upgradeRequired ?? false,
          hiddenCount: j.meta?.hiddenCount ?? 0,
        });
      })
      .catch(() => {
        setWorkers([]);
        setTotal(0);
        setMeta(null);
        setError(true);
      })
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(fetchWorkers, [JSON.stringify(params)]);

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
    <div className="min-h-screen" style={{ background: 'var(--u-bg-dark)' }}>
    <div className="container-page py-8">
      <Breadcrumbs items={[{ label: 'Главная', href: '/' }, { label: 'Специалисты' }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Специалисты</h1>
          <p className="mt-1 text-sm text-white/55">
            {loading ? 'Загружаем...' : `${total} специалистов`}
          </p>
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-2 rounded-input border px-4 py-2.5 text-sm font-medium transition ${
            showFilters || hasActiveFilters
              ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
              : 'border-white/15 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]'
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
        <div className="mt-4 rounded-card border border-white/[0.08] bg-white/[0.04] p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white/80">Фильтры</h3>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 text-xs text-white/50 hover:text-white/80"
              >
                <X className="h-3 w-3" />
                Сбросить все
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1">Категория</label>
              <select
                value={typeof filters.category === 'string' ? filters.category : ''}
                onChange={(e) => setFilters({ category: e.target.value || undefined, page: 1 })}
                className={SELECT_CLASS}
              >
                <option value="">Все</option>
                {CATEGORY_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1">Город</label>
              <select
                value={filters.cityId ?? ''}
                onChange={(e) => setFilters({ cityId: e.target.value || undefined, page: 1 })}
                className={SELECT_CLASS}
              >
                <option value="">Все города</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1">Ставка от</label>
              <input
                type="number"
                min={0}
                value={filters.rateMin ?? ''}
                onChange={(e) => setFilters({ rateMin: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
                placeholder="0"
                className={SELECT_CLASS}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1">Ставка до</label>
              <input
                type="number"
                min={0}
                value={filters.rateMax ?? ''}
                onChange={(e) => setFilters({ rateMax: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
                placeholder="∞"
                className={SELECT_CLASS}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.hasMedicalBook ?? false}
                onChange={(e) => setFilters({ hasMedicalBook: e.target.checked || undefined, page: 1 })}
                className="h-4 w-4 rounded border-white/20 bg-white/[0.06] text-primary-500 [color-scheme:dark]"
              />
              Медкнижка
            </label>
            <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.willingToTravel ?? false}
                onChange={(e) => setFilters({ willingToTravel: e.target.checked || undefined, page: 1 })}
                className="h-4 w-4 rounded border-white/20 bg-white/[0.06] text-primary-500 [color-scheme:dark]"
              />
              Готов к выезду
            </label>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-white/55">{total} результатов</span>
        <select
          value={`${filters.sortBy}_${filters.sortOrder}`}
          onChange={(e) => {
            const [sortBy, sortOrder] = e.target.value.split('_') as [WorkerFilter['sortBy'], WorkerFilter['sortOrder']];
            setFilters({ sortBy, sortOrder, page: 1 });
          }}
          className={SELECT_CLASS}
        >
          <option value="rating_desc">По рейтингу</option>
          <option value="rate_desc">По ставке (убыв.)</option>
          <option value="rate_asc">По ставке (возр.)</option>
          <option value="createdAt_desc">По дате</option>
        </select>
      </div>

      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(8)].map((_, i) => (
            <WorkerCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <RotateCcw className="h-10 w-10 text-white/25" />
          <h3 className="font-semibold text-white/90">Не удалось загрузить данные</h3>
          <button
            onClick={fetchWorkers}
            className="rounded-input bg-primary-500 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-600"
          >
            Попробовать снова
          </button>
        </div>
      ) : workers.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <Search className="h-12 w-12 text-white/25" />
          <h3 className="font-semibold text-white/90">По вашему запросу ничего не найдено</h3>
          <p className="text-sm text-white/50">Попробуйте изменить фильтры</p>
          <button
            onClick={resetFilters}
            className="mt-2 rounded-input bg-primary-500 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-600"
          >
            Сбросить фильтры
          </button>
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
          {meta?.upgradeRequired && (meta?.hiddenCount ?? 0) > 0 && (
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
              <p className="text-sm font-medium text-emerald-200">
                Ещё {meta.hiddenCount} Premium-специалистов доступны на тарифе Бизнес
              </p>
              <a
                href="/pricing"
                className="mt-2 inline-block rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600"
              >
                Улучшить тариф
              </a>
            </div>
          )}
          {total > 20 && (
            <div className="mt-8 flex justify-center gap-2">
              {(filters.page ?? 1) > 1 && (
                <button
                  onClick={() => setFilters({ page: (filters.page ?? 1) - 1 })}
                  className="rounded-input border border-white/15 px-4 py-2 text-sm text-white/70 hover:bg-white/[0.06]"
                >
                  Назад
                </button>
              )}
              <span className="flex items-center px-4 text-sm text-white/55">
                Страница {filters.page ?? 1} из {Math.ceil(total / 20)}
              </span>
              {(filters.page ?? 1) < Math.ceil(total / 20) && (
                <button
                  onClick={() => setFilters({ page: (filters.page ?? 1) + 1 })}
                  className="rounded-input border border-white/15 px-4 py-2 text-sm text-white/70 hover:bg-white/[0.06]"
                >
                  Вперёд
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
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
