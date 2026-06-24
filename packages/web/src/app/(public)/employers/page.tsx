'use client';

import { useEffect, useState, Suspense } from 'react';
import { BUSINESS_TYPES } from '@unity/shared';
import { EmployerCard } from '@/components/catalog/EmployerCard';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { SlidersHorizontal, X, Building2, AlertCircle, RotateCcw } from 'lucide-react';
import { config } from '@/lib/config';
import { Button } from '@/components/ui/button';

const API = config.apiUrl;

interface EmployerProfile {
  id: string;
  slug: string;
  companyName: string | null;
  contactName: string | null;
  logoUrl: string | null;
  description: string | null;
  businessType: string | null;
  city: { id: string; name: string } | null;
  ratingScore: string;
  isVerified: boolean;
  reliabilityScore: string | null;
  responseRate: string | null;
  _count: { vacancies: number };
}

interface City {
  id: string;
  name: string;
}

const BUSINESS_TYPE_OPTIONS = Object.entries(BUSINESS_TYPES);

const SELECT_CLASS =
  'w-full rounded-input border border-white/15 bg-white/[0.06] px-2 py-1.5 text-sm text-white/90 [color-scheme:dark] focus:outline-none focus:border-emerald-500/50';

function EmployersCatalog() {
  const [employers, setEmployers] = useState<EmployerProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [businessType, setBusinessType] = useState('');
  const [cityId, setCityId] = useState('');
  const [sortBy, setSortBy] = useState<'rating' | 'createdAt'>('rating');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch(`${API}/catalog/cities`, { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => setCities(j.data ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(false);
    const params = new URLSearchParams();
    if (businessType) params.set('businessType', businessType);
    if (cityId) params.set('cityId', cityId);
    params.set('sortBy', sortBy);
    params.set('sortOrder', 'desc');
    params.set('page', String(page));
    params.set('limit', '20');

    fetch(`${API}/catalog/employers?${params}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => {
        setEmployers(j.data ?? []);
        setTotal(j.meta?.total ?? 0);
      })
      .catch(() => {
        setEmployers([]);
        setTotal(0);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [businessType, cityId, sortBy, page]);

  const hasActiveFilters = !!businessType || !!cityId;

  const resetFilters = () => {
    setBusinessType('');
    setCityId('');
    setSortBy('rating');
    setPage(1);
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="min-h-screen" style={{ background: 'var(--u-bg-dark)' }}>
    <div className="container-page py-8">
      <Breadcrumbs items={[{ label: 'Главная', href: '/' }, { label: 'Работодатели' }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Работодатели</h1>
          <p className="mt-1 text-sm text-white/55">
            {loading ? 'Загружаем...' : `${total} работодател${getCountSuffix(total)}`}
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
          <div className="mb-3 flex items-center justify-between">
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-white/60">Тип заведения</label>
              <select
                value={businessType}
                onChange={(e) => { setBusinessType(e.target.value); setPage(1); }}
                className={SELECT_CLASS}
              >
                <option value="">Все типы</option>
                {BUSINESS_TYPE_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-white/60">Город</label>
              <select
                value={cityId}
                onChange={(e) => { setCityId(e.target.value); setPage(1); }}
                className={SELECT_CLASS}
              >
                <option value="">Все города</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-white/55">{total} результатов</span>
        <select
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value as typeof sortBy); setPage(1); }}
          className={SELECT_CLASS}
        >
          <option value="rating">По рейтингу</option>
          <option value="createdAt">По дате регистрации</option>
        </select>
      </div>

      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-card bg-white/10" />
          ))}
        </div>
      ) : error ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-12 w-12 text-white/25" />
          <p className="text-white/65">Не удалось загрузить данные</p>
          <Button type="button" variant="outline" onClick={() => { setPage(1); setError(false); }}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Попробовать снова
          </Button>
        </div>
      ) : employers.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <Building2 className="h-12 w-12 text-white/25" />
          <h3 className="font-semibold text-white/90">Ничего не найдено</h3>
          <p className="text-sm text-white/50">Попробуйте изменить фильтры</p>
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
            {employers.map((e) => (
              <EmployerCard key={e.id} {...e} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              {page > 1 && (
                <button
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-input border border-white/15 px-4 py-2 text-sm text-white/70 hover:bg-white/[0.06]"
                >
                  Назад
                </button>
              )}
              <span className="flex items-center px-4 text-sm text-white/55">
                Страница {page} из {totalPages}
              </span>
              {page < totalPages && (
                <button
                  onClick={() => setPage((p) => p + 1)}
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

function getCountSuffix(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'ей';
  if (mod10 === 1) return 'ь';
  if (mod10 >= 2 && mod10 <= 4) return 'я';
  return 'ей';
}

export default function EmployersPage() {
  return (
    <Suspense>
      <EmployersCatalog />
    </Suspense>
  );
}
