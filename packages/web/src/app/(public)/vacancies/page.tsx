'use client';

import { useEffect, useState, Suspense } from 'react';
import { STAFF_CATEGORIES, EVENT_TYPES, EMPLOYMENT_TYPES } from '@unity/shared';
import { vacancyFilterSchema, type VacancyFilter } from '@/lib/filters/schemas';
import { useFilters } from '@/lib/filters/useFilters';
import { VacancyCard } from '@/components/catalog/VacancyCard';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/lib/api/client';
import { SlidersHorizontal, X, Briefcase } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

interface VacancyItem {
  id: string;
  title: string;
  category: string;
  rate: string;
  rateType: string;
  eventType: string | null;
  employmentType: string;
  dateStart: string;
  employer: { id: string; companyName: string | null; contactName: string | null; isVerified: boolean };
  city: { id: string; name: string } | null;
}

interface City { id: string; name: string }

const DEFAULTS: Partial<VacancyFilter> = { sortBy: 'date', sortOrder: 'desc', page: 1 };

function VacanciesCatalog() {
  const { user, isAuthenticated } = useAuthStore();
  const { filters, setFilters, resetFilters } = useFilters(vacancyFilterSchema, DEFAULTS);
  const [vacancies, setVacancies] = useState<VacancyItem[]>([]);
  const [total, setTotal] = useState(0);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/catalog/cities`, { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => setCities(j.data ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.activeRole === 'worker') {
      apiClient
        .get<{ data: { id: string }[] }>('/worker/favorites/vacancies')
        .then((res) => setFavoriteIds(new Set(res.data.map((v) => v.id))))
        .catch(() => {});
    }
  }, [isAuthenticated, user?.activeRole]);

  const params: Record<string, unknown> = {
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.cityId ? { cityId: filters.cityId } : {}),
    ...(filters.rateMin !== undefined ? { rateMin: filters.rateMin } : {}),
    ...(filters.rateMax !== undefined ? { rateMax: filters.rateMax } : {}),
    ...(filters.eventType ? { eventType: filters.eventType } : {}),
    ...(filters.employmentType ? { employmentType: filters.employmentType } : {}),
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
    fetch(`${API}/catalog/vacancies?${searchParams}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => {
        setVacancies(j.data ?? []);
        setTotal(j.meta?.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [JSON.stringify(params)]);

  const toggleFavorite = async (vacancyId: string) => {
    if (!isAuthenticated) return;
    const isFav = favoriteIds.has(vacancyId);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(vacancyId);
      else next.add(vacancyId);
      return next;
    });
    try {
      if (isFav) await apiClient.delete(`/worker/favorites/vacancies/${vacancyId}`);
      else await apiClient.post(`/worker/favorites/vacancies/${vacancyId}`);
    } catch {
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (isFav) next.add(vacancyId);
        else next.delete(vacancyId);
        return next;
      });
    }
  };

  const apply = async (vacancyId: string) => {
    if (!isAuthenticated) return;
    setApplyingId(vacancyId);
    try {
      await apiClient.post('/worker/applications', { vacancyId });
    } catch {
      // error handled silently
    } finally {
      setApplyingId(null);
    }
  };

  const hasActiveFilters =
    filters.category !== undefined ||
    filters.cityId !== undefined ||
    filters.rateMin !== undefined ||
    filters.rateMax !== undefined ||
    filters.eventType !== undefined ||
    filters.employmentType !== undefined;

  const categoryOptions = Object.entries(STAFF_CATEGORIES);
  const eventTypeOptions = Object.entries(EVENT_TYPES);
  const employmentTypeOptions = Object.entries(EMPLOYMENT_TYPES);

  return (
    <div className="container-page py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Вакансии</h1>
          <p className="mt-1 text-sm text-gray-500">Найдите работу в event-индустрии</p>
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
                className="w-full rounded-input border border-gray-300 px-2 py-1.5 text-sm focus:outline-none"
              >
                <option value="">Все</option>
                {categoryOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
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
              <label className="block text-xs font-medium text-gray-600 mb-1">Тип мероприятия</label>
              <select
                value={typeof filters.eventType === 'string' ? filters.eventType : ''}
                onChange={(e) => setFilters({ eventType: e.target.value || undefined, page: 1 })}
                className="w-full rounded-input border border-gray-300 px-2 py-1.5 text-sm focus:outline-none"
              >
                <option value="">Все</option>
                {eventTypeOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Тип занятости</label>
              <select
                value={filters.employmentType ?? ''}
                onChange={(e) => setFilters({ employmentType: e.target.value || undefined, page: 1 })}
                className="w-full rounded-input border border-gray-300 px-2 py-1.5 text-sm focus:outline-none"
              >
                <option value="">Все</option>
                {employmentTypeOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
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
                className="w-full rounded-input border border-gray-300 px-2 py-1.5 text-sm"
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
                className="w-full rounded-input border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-gray-500">{total} вакансий</span>
        <select
          value={`${filters.sortBy}_${filters.sortOrder}`}
          onChange={(e) => {
            const [sortBy, sortOrder] = e.target.value.split('_') as [VacancyFilter['sortBy'], VacancyFilter['sortOrder']];
            setFilters({ sortBy, sortOrder, page: 1 });
          }}
          className="rounded-input border border-gray-300 px-2 py-1.5 text-sm focus:outline-none"
        >
          <option value="date_desc">По дате (новые)</option>
          <option value="date_asc">По дате (старые)</option>
          <option value="rate_desc">По ставке (убыв.)</option>
          <option value="rate_asc">По ставке (возр.)</option>
        </select>
      </div>

      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-card bg-gray-200" />
          ))}
        </div>
      ) : vacancies.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <Briefcase className="h-12 w-12 text-gray-300" />
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
            {vacancies.map((v) => (
              <VacancyCard
                key={v.id}
                {...v}
                isAuthenticated={isAuthenticated}
                isFavorite={favoriteIds.has(v.id)}
                userRole={user?.activeRole}
                onFavoriteToggle={user?.activeRole === 'worker' ? toggleFavorite : undefined}
                onApply={user?.activeRole === 'worker' ? apply : undefined}
              />
            ))}
          </div>
          {total > 20 && (
            <div className="mt-8 flex justify-center gap-2">
              {filters.page > 1 && (
                <button
                  onClick={() => setFilters({ page: filters.page - 1 })}
                  className="rounded-input border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
                >
                  Назад
                </button>
              )}
              <span className="flex items-center px-4 text-sm text-gray-500">
                Страница {filters.page} из {Math.ceil(total / 20)}
              </span>
              {filters.page < Math.ceil(total / 20) && (
                <button
                  onClick={() => setFilters({ page: filters.page + 1 })}
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

export default function VacanciesPage() {
  return (
    <Suspense>
      <VacanciesCatalog />
    </Suspense>
  );
}
