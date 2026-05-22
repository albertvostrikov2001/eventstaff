'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import {
  EmployerCatalogWorkerCard,
  type EmployerCatalogWorker,
} from '@/components/employer/EmployerCatalogWorkerCard';
import { EmployerInviteVacancyModal } from '@/components/employer/EmployerInviteVacancyModal';
import {
  useEmployerFavoriteWorkerIdsQuery,
  useIsEmployerFavoritesLoaded,
  useToggleEmployerFavorite,
} from '@/hooks/useEmployerFavoriteWorkerIds';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { Button } from '@/components/ui/button';

function FavoritesInner() {
  const { toast } = useToast();
  const isEmployer = useIsEmployerFavoritesLoaded();
  const [page, setPage] = useState(1);
  const perPage = 12;

  const { data: favIdsRaw = [] } = useEmployerFavoriteWorkerIdsQuery(isEmployer);
  const [workers, setWorkers] = useState<EmployerCatalogWorker[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<{ id: string; name: string } | null>(null);
  const [favBusy, setFavBusy] = useState<string | null>(null);

  const toggleFavorite = useToggleEmployerFavorite();

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    void apiClient
      .get<{ success?: boolean; data: EmployerCatalogWorker[]; meta?: { total?: number } }>(
        '/employer/favorites',
        { page, perPage },
      )
      .then((res) => {
        if (cancel) return;
        setWorkers(res.data ?? []);
        setTotal(res.meta?.total ?? (res.data?.length ?? 0));
      })
      .catch(() => {
        if (cancel) return;
        toast('Не удалось загрузить избранное', 'error');
        setWorkers([]);
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [page, perPage, toast]);

  const favoriteSet = useMemo(() => new Set(favIdsRaw), [favIdsRaw]);

  const removeFavorite = useCallback(
    async (workerId: string) => {
      setFavBusy(workerId);
      try {
        await toggleFavorite.mutateAsync({ workerId, add: false });
      } finally {
        setFavBusy(null);
      }
    },
    [toggleFavorite],
  );

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="min-w-0">
      <h1 className="text-2xl font-bold tracking-tight text-white md:text-[28px]">Избранное</h1>
      <p className="mt-2 text-sm text-white/55">Список сохранённых кандидатов</p>

      <div className="mt-8">
        {loading ? (
          <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-[280px] animate-pulse rounded-[16px] border border-white/[0.06] bg-white/[0.04]"
              />
            ))}
          </div>
        ) : workers.length === 0 ? (
          total === 0 ? (
            <div className="rounded-[18px] border border-dashed border-white/[0.12] bg-black/20 px-6 py-16 text-center">
              <Heart className="mx-auto mb-4 h-10 w-10 text-white/40" aria-hidden />
              <h3 className="font-semibold text-white">У вас пока нет избранных кандидатов</h3>
              <p className="mx-auto mb-8 mt-3 max-w-md text-sm text-white/58">
                Найдите специалистов в разделе «Поиск персонала» и сохраняйте подходящих исполнителей.
              </p>
              <Link
                href="/employer/search"
                className="inline-flex rounded-[12px] bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-900/35"
              >
                Найти персонал
              </Link>
            </div>
          ) : (
            <div className="rounded-[18px] border border-white/[0.08] bg-white/[0.04] px-6 py-12 text-center text-sm text-white/60">
              На этой странице результатов пока нет — попробуйте другую страницу.
            </div>
          )
        ) : (
          <>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-2">
              {workers.map((w) => (
                <EmployerCatalogWorkerCard
                  key={w.id}
                  worker={w}
                  isFavorite={favoriteSet.has(w.id)}
                  favoriteBusy={favBusy === w.id || toggleFavorite.isPending}
                  onFavoriteToggle={() => void removeFavorite(w.id)}
                  onInvite={() =>
                    setInvite({ id: w.id, name: `${w.firstName} ${w.lastName}`.trim() })
                  }
                  chatRecipientUserId={w.user?.id ?? undefined}
                />
              ))}
            </div>

            {totalPages > 1 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-10 text-sm text-white/65">
                <span>
                  Страница {page} из {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="muted"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Назад
                  </Button>
                  <Button
                    type="button"
                    variant="muted"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Далее
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
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

export default function EmployerFavoritesPage() {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse space-y-4">
          <div className="h-10 w-48 rounded-xl bg-white/[0.06]" />
          <div className="h-[320px] rounded-[18px] border border-white/[0.06] bg-white/[0.04]" />
        </div>
      }
    >
      <FavoritesInner />
    </Suspense>
  );
}
