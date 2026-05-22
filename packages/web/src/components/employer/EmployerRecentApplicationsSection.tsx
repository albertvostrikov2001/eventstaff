'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { MoreHorizontal, Inbox, RefreshCw, Star, UserRound } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { APPLICATION_STATUSES } from '@unity/shared';
import { cn } from '@/lib/utils';
import { OpenChatButton } from '@/components/chat/OpenChatButton';
import { formatRelativeTimeRu } from '@/lib/format-relative-ru';

export interface RecentApplicationRow {
  id: string;
  status: string;
  createdAt: string;
  worker: {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    photoUrl: string | null;
    ratingScore: unknown;
  };
  vacancy: { id: string; title: string; city: { name: string } | null };
}

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-[72px] animate-pulse rounded-[14px] border border-white/[0.06] bg-white/[0.04]"
        />
      ))}
    </div>
  );
}

function statusTone(status: string) {
  if (status === 'rejected') return 'bg-red-500/15 text-red-200 ring-1 ring-red-500/30';
  if (['confirmed', 'completed', 'shift_started'].includes(status)) {
    return 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30';
  }
  return 'bg-amber-500/12 text-amber-100 ring-1 ring-amber-500/25';
}

function statusLabelRu(status: string): string {
  if (status === 'pending' || status === 'viewed' || status === 'invited' || status === 'interview') {
    return 'На рассмотрении';
  }
  if (['confirmed', 'completed', 'shift_started'].includes(status)) return 'Принят';
  if (status === 'rejected') return 'Отклонён';
  return APPLICATION_STATUSES[status as keyof typeof APPLICATION_STATUSES] ?? status;
}

export function EmployerRecentApplicationsSection({ hasVacancies }: { hasVacancies: boolean }) {
  const { toast } = useToast();
  const [apps, setApps] = useState<RecentApplicationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const fetchRecent = useCallback(() => {
    setLoading(true);
    setError(false);
    apiClient
      .get<{ success?: boolean; data: RecentApplicationRow[]; meta: { total: number } }>(
        '/employer/applications/recent',
        { limit: 5 },
      )
      .then((res) => {
        setApps(res.data);
        setTotal(res.meta?.total ?? 0);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void fetchRecent();
  }, [fetchRecent]);

  const updateStatus = async (id: string, status: 'confirmed' | 'rejected') => {
    try {
      await apiClient.patch(`/employer/applications/${id}/status`, { status });
      setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
      toast(status === 'confirmed' ? 'Отклик принят' : 'Отклик отклонён', 'success');
    } catch {
      toast('Не удалось обновить статус', 'error');
    }
  };

  if (loading) {
    return (
      <section
        className="rounded-[14px] border border-white/[0.08] bg-white/[0.04] p-6"
        aria-busy="true"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-white">Последние отклики</h3>
          <Link
            href="/employer/applications"
            className="text-xs font-medium text-emerald-300/90 transition hover:text-emerald-200"
          >
            Все
          </Link>
        </div>
        <SkeletonRows />
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-[14px] border border-white/[0.08] bg-white/[0.04] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-white">Последние отклики</h3>
          <button
            type="button"
            onClick={() => void fetchRecent()}
            className="flex items-center gap-1 text-xs font-medium text-emerald-300/90 hover:text-emerald-200"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Попробовать снова
          </button>
        </div>
        <p className="py-10 text-center text-sm text-white/55">Не удалось загрузить отклики</p>
      </section>
    );
  }

  if (apps.length === 0) {
    return (
      <section className="rounded-[14px] border border-white/[0.08] bg-white/[0.04] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-white">Последние отклики</h3>
          <Link
            href="/employer/applications"
            className="text-xs font-medium text-emerald-300/90 transition hover:text-emerald-200"
          >
            Все
          </Link>
        </div>
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <Inbox className="h-10 w-10 text-white/40" aria-hidden />
          <p className="text-sm text-white/55">
            {hasVacancies
              ? 'Пока нет откликов. Разместите вакансию на главной странице — кандидаты появятся здесь.'
              : 'Пока нет откликов. Опубликуйте вакансию — кандидаты появятся здесь.'}
          </p>
          {!hasVacancies ? (
            <Link
              href="/employer/vacancies/new"
              className="mt-2 inline-flex rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 px-5 py-2 text-sm font-semibold text-gray-950"
            >
              Опубликовать вакансию
            </Link>
          ) : (
            <Link href="/" className="mt-2 text-xs font-medium text-emerald-300/90 hover:text-emerald-200">
              На сайт →
            </Link>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[14px] border border-white/[0.08] bg-white/[0.04] p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-white">Последние отклики</h3>
        <Link
          href="/employer/applications"
          className="text-xs font-medium text-emerald-300/90 transition hover:text-emerald-200"
        >
          Все
        </Link>
      </div>

      <p className="sr-only">
        Всего откликов по вакансиям компании:
        {total}
      </p>

      <ul className="space-y-2">
        {apps.map((a) => {
          const ratingNum = Number(a.worker.ratingScore);
          const hasRating = !Number.isNaN(ratingNum) && ratingNum > 0;
          const wName = `${a.worker.firstName} ${a.worker.lastName}`.trim();
          const initials =
            `${a.worker.firstName?.[0] ?? ''}${a.worker.lastName?.[0] ?? ''}`.trim() ||
            '?';

          return (
            <li
              key={a.id}
              className={cn(
                'flex gap-3 rounded-[14px] border border-white/[0.06] bg-white/[0.03]',
                'p-3 sm:items-start',
              )}
            >
              <div className="shrink-0">
                <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white/10">
                  {a.worker.photoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={a.worker.photoUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserRound className="h-4 w-4 text-white/40" />
                  )}
                  <span className="sr-only">{initials}</span>
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="truncate text-sm font-medium text-white">{wName}</span>
                  {hasRating ? (
                    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-white/10 px-1.5 py-0 text-[11px] text-amber-200">
                      <Star className="h-3 w-3 fill-current" aria-hidden />
                      {ratingNum.toFixed(1)}
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      'ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                      statusTone(a.status),
                    )}
                  >
                    {statusLabelRu(a.status)}
                  </span>
                </div>
                <div className="truncate text-xs text-white/55">
                  <Link
                    href={`/employer/vacancies/${a.vacancy.id}/applications`}
                    className="text-emerald-200/90 underline-offset-2 hover:underline"
                  >
                    {a.vacancy.title}
                  </Link>
                  {a.vacancy.city?.name ? (
                    <>
                      {' '}
                      · {a.vacancy.city.name}
                    </>
                  ) : null}
                </div>
                <time className="block text-[11px] text-white/50" dateTime={a.createdAt}>
                  {formatRelativeTimeRu(a.createdAt)}
                </time>
              </div>

              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    type="button"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white"
                    aria-label="Действия по отклику"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    className="z-[80] min-w-[200px] rounded-xl border border-white/10 bg-[#111f18] py-1.5 shadow-2xl"
                    sideOffset={4}
                  >
                    <DropdownMenu.Item asChild>
                      <Link
                        href={`/workers/${a.worker.id}`}
                        className="block px-4 py-2 text-sm outline-none hover:bg-white/10"
                      >
                        Открыть профиль
                      </Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      className="cursor-default px-4 py-2 outline-none"
                      onSelect={(e) => e.preventDefault()}
                    >
                      {a.worker.userId ? (
                        <OpenChatButton
                          recipientUserId={a.worker.userId}
                          context={{ type: 'APPLICATION', id: a.id }}
                          label="Открыть чат"
                          className="flex w-full justify-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-40"
                        />
                      ) : null}
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator className="my-1 h-px bg-white/10" />
                    <DropdownMenu.Item
                      className="cursor-pointer px-4 py-2 text-sm outline-none hover:bg-emerald-500/20"
                      disabled={!['pending', 'viewed', 'invited', 'interview'].includes(a.status)}
                      onSelect={(e) => {
                        e.preventDefault();
                        void updateStatus(a.id, 'confirmed');
                      }}
                    >
                      Принять
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      className="cursor-pointer px-4 py-2 text-sm outline-none hover:bg-red-500/25"
                      disabled={
                        ['rejected', 'cancelled'].includes(a.status)
                      }
                      onSelect={(e) => {
                        e.preventDefault();
                        void updateStatus(a.id, 'rejected');
                      }}
                    >
                      Отклонить
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
