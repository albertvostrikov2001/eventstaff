'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { STAFF_CATEGORIES } from '@unity/shared';
import { SlidersHorizontal, X } from 'lucide-react';
import { EmployerCatalogWorkerCard, type EmployerCatalogWorker } from '@/components/employer/EmployerCatalogWorkerCard';
import { EmployerInviteVacancyModal } from '@/components/employer/EmployerInviteVacancyModal';
import {
  useEmployerFavoriteWorkerIdsQuery,
  useIsEmployerFavoritesLoaded,
  useToggleEmployerFavorite,
} from '@/hooks/useEmployerFavoriteWorkerIds';
import {
  employerStaffSearchFiltersSchema,
  type EmployerStaffSearchFilters,
} from '@/lib/filters/schemas';
import { useFilters } from '@/lib/filters/useFilters';
import { useToast } from '@/components/ui/toast-context';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

interface City {
  id: string;
  name: string;
}

const DEFAULTS: Partial<EmployerStaffSearchFilters> = {
  sort: 'rating',
  page: 1,
  perPage: 12,
};

function buildQueryParams(filters: EmployerStaffSearchFilters): URLSearchParams {
  const qp = new URLSearchParams();

  const categories = filters.category ? ([] as string[]).concat(filters.category as string | string[]) : [];
  for (const c of categories) {
    qp.append('category', c);
  }

  if (filters.cityId) qp.set('cityId', filters.cityId);
  if (filters.search?.trim()) qp.set('search', filters.search.trim());

  const sliderMinRating = filters.minRating;
  if (sliderMinRating != null && sliderMinRating >= 4.01) {
    qp.set('minRating', String(sliderMinRating));
  }

  const minExperience = filters.minExperience;
  if (minExperience != null && minExperience >= 1) {
    qp.set('minExperience', String(minExperience));
  }

  if (filters.verified === true) qp.set('verified', 'true');

  if (filters.readyForTrips === true) qp.set('readyForTrips', 'true');

  if (filters.readyForOvertime === true) qp.set('readyForOvertime', 'true');

  if (filters.availability === 'available') {
    qp.set('availability', 'available');
  }

  qp.set('sort', filters.sort ?? 'rating');
  qp.set('page', String(filters.page ?? 1));
  qp.set('perPage', String(filters.perPage ?? 12));
  qp.set('limit', String(filters.perPage ?? 12));

  return qp;
}

function EmployerSearchInner() {
  const { toast } = useToast();
  const [cities, setCities] = useState<City[]>([]);
  const [workers, setWorkers] = useState<EmployerCatalogWorker[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [invite, setInvite] = useState<{ id: string; name: string } | null>(null);
  const isEmployer = useIsEmployerFavoritesLoaded();
  const { data: favList = [], isFetched: favoritesReady } = useEmployerFavoriteWorkerIdsQuery(isEmployer);
  const favoriteSet = useMemo(() => new Set(favList), [favList]);
  const toggleFavorite = useToggleEmployerFavorite();
  const [favBusy, setFavBusy] = useState<string | null>(null);

  const { filters, setFilters, resetFilters } = useFilters(
    employerStaffSearchFiltersSchema,
    DEFAULTS,
  );

  useEffect(() => {
    fetch(`${API}/catalog/cities`, { credentials: 'include' })
      .then((r) => r.json())
      .then((j: { data?: City[] }) => setCities(j.data ?? []))
      .catch(() => setCities([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    const qp = buildQueryParams(filters as EmployerStaffSearchFilters);
    void fetch(`${API}/catalog/workers?${qp.toString()}`, { credentials: 'include' })
      .then(async (r) => {
        const j = (await r.json().catch(() => ({}))) as {
          data?: EmployerCatalogWorker[];
          meta?: { total?: number };
        };
        setWorkers(Array.isArray(j.data) ? j.data : []);
        setTotal(Number(j.meta?.total ?? (Array.isArray(j.data) ? j.data.length : 0)));
      })
      .catch(() => setWorkers([]))
      .finally(() => setLoading(false));
  }, [filters]);

  const toggleCategory = (code: string) => {
    const cur = ([] as string[]).concat(filters.category ?? []).filter(Boolean);
    const has = cur.includes(code);
    setFilters({
      category: has ? cur.filter((c) => c !== code) : [...cur, code],
      page: 1,
    });
  };

  const sliderValue = filters.minRating ?? 4;

  const onHeart = useCallback(
    async (workerId: string, nextFavorite: boolean) => {
      if (!isEmployer || !favoritesReady) {
        toast('Войдите как работодатель', 'error');
        return;
      }
      setFavBusy(workerId);
      try {
        await toggleFavorite.mutateAsync({ workerId, add: nextFavorite });
      } finally {
        setFavBusy(null);
      }
    },
    [favoritesReady, isEmployer, toast, toggleFavorite],
  );

  const totalPages = Math.max(1, Math.ceil(total / Number(filters.perPage ?? 12)));

  return (
    <div className="min-w-0">
      <div className="mb-6 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-white md:text-[28px]">Поиск персонала</h1>
          <p className="mt-2 text-sm text-white/55">
            {loading ? 'Загрузка…' : `${total} профилей по текущим условиям`}
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap gap-3">
          <label className="flex min-w-0 flex-[1_1_200px] flex-col text-xs font-medium text-white/50">
            <span className="mb-1.5 sr-only">Сортировка</span>
            <select
              value={filters.sort}
              onChange={(e) =>
                setFilters({ sort: e.target.value as EmployerStaffSearchFilters['sort'], page: 1 })
              }
              className="min-w-0 rounded-[14px] border border-white/[0.1] bg-white/[0.06] px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500/50"
            >
              <option value="rating">Рейтинг</option>
              <option value="experience">Опыт</option>
              <option value="newest">Дата регистрации</option>
              <option value="price_asc">Стоимость ↑</option>
              <option value="price_desc">Стоимость ↓</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => setMobileFiltersOpen((v) => !v)}
            className="inline-flex items-center justify-center gap-2 rounded-[14px] border border-white/[0.12] bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white/90 lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" /> Фильтры
          </button>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
        <aside
          className={`relative min-w-0 shrink-0 rounded-[18px] border border-white/[0.08] bg-white/[0.04] p-5 lg:sticky lg:top-28 lg:w-[296px] ${
            mobileFiltersOpen ? 'block' : 'hidden'
          } lg:block`}
          aria-hidden={false}
        >
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <span className="text-sm font-semibold text-white">Фильтры</span>
            <button type="button" className="p-2 text-white/60" onClick={() => setMobileFiltersOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-5 text-sm">
            <div>
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-emerald-200/85">
                Категории
              </div>
              <div className="flex max-h-48 flex-col gap-2 overflow-y-auto pr-2">
                {Object.entries(STAFF_CATEGORIES).map(([code, label]) => (
                  <label key={code} className="flex cursor-pointer items-center gap-2 text-white/85">
                    <input
                      type="checkbox"
                      checked={([] as string[]).concat(filters.category ?? []).includes(code)}
                      onChange={() => toggleCategory(code)}
                      className="rounded border-white/30 bg-transparent text-emerald-500 focus:ring-emerald-500/40"
                    />
                    <span className="truncate">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-emerald-200/85">
                Город
              </span>
              <select
                value={filters.cityId ?? ''}
                onChange={(e) => setFilters({ cityId: e.target.value || undefined, page: 1 })}
                className="w-full rounded-[12px] border border-white/[0.12] bg-white/[0.05] px-3 py-2 text-white outline-none focus:border-emerald-500/50"
              >
                <option value="">Все города</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id} className="text-gray-900">
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-200/85">
                Мин. рейтинг (4–5)
              </div>
              <input
                type="range"
                min={4}
                max={5}
                step={0.1}
                value={sliderValue}
                onChange={(e) => setFilters({ minRating: Number(e.target.value), page: 1 })}
                className="w-full accent-emerald-500"
              />
              <div className="mt-1 text-xs text-white/60">{sliderValue.toFixed(1)} и выше</div>
            </div>

            <div>
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-emerald-200/85">
                Опыт
              </div>
              <div className="flex flex-col gap-2 text-white/85">
                {[
                  { v: undefined, l: 'Любой' },
                  { v: 1, l: 'от 1 года' },
                  { v: 3, l: 'от 3 лет' },
                  { v: 5, l: 'от 5 лет' },
                ].map(({ v, l }) => (
                  <label key={l} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="exp-employer-search"
                      checked={
                        v === undefined
                          ? !(filters.minExperience && filters.minExperience >= 1)
                          : filters.minExperience === v
                      }
                      onChange={() =>
                        setFilters({
                          ...(v !== undefined ? { minExperience: v } : { minExperience: undefined }),
                          page: 1,
                        })
                      }
                      className="border-white/30 bg-transparent text-emerald-500"
                    />
                    {l}
                  </label>
                ))}
              </div>
            </div>

            {(
              [
                ['verified', 'Только верифицированные', filters.verified] as const,
                ['readyForTrips', 'Готов к выездам', filters.readyForTrips] as const,
                ['readyForOvertime', 'Готов к овертаймам', filters.readyForOvertime] as const,
              ] as const
            ).map(([key, label, val]) => (
              <label key={key} className="flex cursor-pointer items-center justify-between gap-3 text-white/85">
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={val === true}
                  onChange={(e) =>
                    setFilters({
                      [key]: e.target.checked ? true : undefined,
                      page: 1,
                    })
                  }
                  className="rounded border-white/30 text-emerald-500"
                />
              </label>
            ))}

            <label className="flex cursor-pointer items-center justify-between gap-3 text-white/85">
              <span>Только доступные сейчас</span>
              <input
                type="checkbox"
                checked={filters.availability === 'available'}
                onChange={(e) =>
                  setFilters({
                    availability: e.target.checked ? 'available' : undefined,
                    page: 1,
                  })
                }
                className="rounded border-white/30 text-emerald-500"
              />
            </label>

            <div className="space-y-2 border-t border-white/[0.08] pt-4">
              <button
                type="button"
                onClick={() => resetFilters()}
                className="w-full rounded-[12px] border border-white/[0.12] py-2.5 text-xs font-semibold text-white/80 hover:bg-white/[0.06]"
              >
                Сбросить фильтры
              </button>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-medium text-white/50">Поиск по имени</span>
            <input
              value={filters.search ?? ''}
              onChange={(e) =>
                setFilters({
                  search: e.target.value || undefined,
                  page: 1,
                })
              }
              placeholder="Иван…"
              className="w-full max-w-xl rounded-[14px] border border-white/[0.1] bg-white/[0.05] px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-emerald-500/50"
            />
          </label>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-[280px] animate-pulse rounded-[16px] border border-white/[0.06] bg-white/[0.04]" />
              ))}
            </div>
          ) : workers.length === 0 ? (
            <div className="rounded-[16px] border border-dashed border-white/[0.12] bg-black/20 px-6 py-16 text-center">
              <p className="mb-6 text-white/65">По вашим фильтрам никто не найден</p>
              <button
                type="button"
                onClick={() => resetFilters()}
                className="inline-flex rounded-[12px] bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-900/35"
              >
                Сбросить фильтры
              </button>
            </div>
          ) : (
            <>
              <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-2">
                {workers.map((w) => (
                  <EmployerCatalogWorkerCard
                    key={w.id}
                    worker={w}
                    isFavorite={favoriteSet.has(w.id)}
                    favoriteBusy={favBusy === w.id || toggleFavorite.isPending}
                    onFavoriteToggle={() => void onHeart(w.id, !favoriteSet.has(w.id))}
                    onInvite={() =>
                      setInvite({ id: w.id, name: `${w.firstName} ${w.lastName}`.trim() })
                    }
                    chatRecipientUserId={w.user?.id ?? undefined}
                  />
                ))}
              </div>

              {totalPages > 1 ? (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-6 text-sm text-white/65">
                  <span>
                    Стр. {filters.page ?? 1} / {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={(filters.page ?? 1) <= 1}
                      onClick={() => setFilters({ page: Math.max(1, (filters.page ?? 1) - 1) })}
                      className="rounded-[12px] border border-white/[0.1] px-4 py-2 text-white/85 disabled:opacity-40"
                    >
                      Назад
                    </button>
                    <button
                      type="button"
                      disabled={(filters.page ?? 1) >= totalPages}
                      onClick={() =>
                        setFilters({ page: Math.min(totalPages, (filters.page ?? 1) + 1) })
                      }
                      className="rounded-[12px] border border-white/[0.1] px-4 py-2 text-white/85 disabled:opacity-40"
                    >
                      Далее
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      {invite ? (
        <EmployerInviteVacancyModal
          workerId={invite.id}
          workerName={invite.name}
          open
          onClose={() => setInvite(null)}
        />
      ) : null}
    </div>
  );
}

export default function EmployerSearchPage() {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse space-y-6">
          <div className="h-10 max-w-xs rounded-xl bg-white/[0.07]" />
          <div className="h-72 rounded-[18px] border border-white/[0.06] bg-white/[0.04]" />
        </div>
      }
    >
      <EmployerSearchInner />
    </Suspense>
  );
}
