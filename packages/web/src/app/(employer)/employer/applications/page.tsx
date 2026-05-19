'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { MoreHorizontal, Search, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { APPLICATION_STATUSES } from '@unity/shared';
import { cn } from '@/lib/utils';
import { OpenChatButton } from '@/components/chat/OpenChatButton';
import { formatRelativeTimeRu } from '@/lib/format-relative-ru';


interface ApplicationRow {
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

interface VacancyOpt {
  id: string;
  title: string;
}

function rowCardCls() {
  return 'rounded-[14px] border border-white/[0.08] bg-white/[0.04] px-4 py-3';
}

export default function EmployerApplicationsPage() {
  const { toast } = useToast();
  const [vacancies, setVacancies] = useState<VacancyOpt[]>([]);
  const [apps, setApps] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, perPage: 20 });
  const [status, setStatus] = useState<string>('');
  const [vacancyId, setVacancyId] = useState('');
  const [search, setSearch] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'rating'>('newest');

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await apiClient.get<{
        success?: boolean;
        data: ApplicationRow[];
        meta: { total: number; page: number; perPage: number; totalPages: number };
      }>('/employer/applications', {
        page,
        perPage: 20,
        ...(status ? { status } : {}),
        ...(vacancyId ? { vacancyId } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
        sort,
      });
      setApps(res.data);
      setMeta({
        total: res.meta.total,
        totalPages: res.meta.totalPages,
        perPage: res.meta.perPage,
      });
    } catch {
      setError(true);
      toast('Не удалось загрузить отклики', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, status, vacancyId, search, sort, toast]);

  useEffect(() => {
    apiClient
      .get<{ data: { id: string; title: string }[] }>('/employer/vacancies')
      .then((r) => setVacancies(r.data))
      .catch(() => setVacancies([]));
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchDraft), 360);
    return () => window.clearTimeout(t);
  }, [searchDraft]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const updateStatus = async (id: string, st: 'confirmed' | 'rejected') => {
    try {
      await apiClient.patch(`/employer/applications/${id}/status`, { status: st });
      setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status: st } : a)));
      toast(st === 'confirmed' ? 'Отклик принят' : 'Отклик отклонён', 'success');
    } catch {
      toast('Не удалось обновить статус', 'error');
    }
  };

  const statusTone = (s: string) => {
    if (s === 'rejected') return 'bg-red-500/15 text-red-200 ring-1 ring-red-500/30';
    if (['confirmed', 'completed', 'shift_started'].includes(s)) {
      return 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30';
    }
    return 'bg-amber-500/12 text-amber-100 ring-1 ring-amber-500/25';
  };

  const statusRu = (s: string): string =>
    (APPLICATION_STATUSES as Record<string, string>)[s] ?? s;

  return (
    <div className="text-white">
      <h1 className="text-2xl font-bold">Все отклики</h1>
      <p className="mt-1 text-sm text-white/50">
        Отклики по всем вашим вакансиям — фильтрация и сортировка
      </p>

      <div className={`mt-6 grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4 ${rowCardCls()} bg-white/[0.03]`}>
        <div>
          <label className="text-xs font-medium text-white/50">Поиск по имени</label>
          <div className="relative mt-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <input
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-emerald-500/40"
              placeholder="Имя или фамилия"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-white/50">Статус</label>
          <select
            className="mt-1 w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 py-2 px-3 text-sm text-white [color-scheme:dark]"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
          >
            <option value="">Все</option>
            {(
              Object.keys(APPLICATION_STATUSES) as (keyof typeof APPLICATION_STATUSES)[]
            ).map((s) => (
              <option key={s} value={s}>
                {APPLICATION_STATUSES[s]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-white/50">Вакансия</label>
          <select
            className="mt-1 w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 py-2 px-3 text-sm text-white"
            value={vacancyId}
            onChange={(e) => {
              setPage(1);
              setVacancyId(e.target.value);
            }}
          >
            <option value="">Все вакансии</option>
            {vacancies.map((v) => (
              <option key={v.id} value={v.id}>
                {v.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-white/50">Сортировка</label>
          <select
            className="mt-1 w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 py-2 px-3 text-sm text-white"
            value={sort}
            onChange={(e) => {
              setPage(1);
              setSort(e.target.value as 'newest' | 'oldest' | 'rating');
            }}
          >
            <option value="newest">Сначала новые</option>
            <option value="oldest">Сначала старые</option>
            <option value="rating">По рейтингу работника</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="mt-8 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`h-[88px] animate-pulse ${rowCardCls()}`} />
          ))}
        </div>
      ) : error ? (
        <div className="mt-10 flex flex-col items-center gap-3 text-white/65">
          <p>Не удалось загрузить отклики</p>
          <button
            type="button"
            onClick={() => void fetchList()}
            className="flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/5"
          >
            <RefreshCw className="h-4 w-4" /> Попробовать снова
          </button>
        </div>
      ) : apps.length === 0 ? (
        <div className={`mt-8 flex flex-col items-center gap-3 py-16 text-center ${rowCardCls()}`}>
          <Search className="h-10 w-10 text-white/25" />
          <p className="text-sm text-white/55">
            По выбранным условиям откликов нет. Измените фильтры или{' '}
            <Link href="/employer/vacancies/new" className="text-emerald-300 hover:underline">
              создайте вакансию
            </Link>
          </p>
        </div>
      ) : (
        <>
          <div className="mt-8 space-y-2">
            {/* Desktop */}
            <div className="hidden xl:block overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2 text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium uppercase tracking-wide text-white/45">
                    <th className="px-3 py-2">Работник</th>
                    <th className="px-3 py-2">Вакансия</th>
                    <th className="px-3 py-2">Отклик</th>
                    <th className="px-3 py-2">Статус</th>
                    <th className="px-3 py-2 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {apps.map((a) => {
                    const rn = Number(a.worker.ratingScore);
                    return (
                      <tr key={a.id} className={rowCardCls()}>
                        <td className="rounded-l-[14px] px-3 py-3">
                          <div className="font-medium text-white/95">
                            {a.worker.firstName} {a.worker.lastName}
                          </div>
                          <div className="text-xs text-white/45">{!Number.isNaN(rn) ? `★ ${rn.toFixed(1)}` : '—'}</div>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <Link
                            className="text-emerald-200/90 underline-offset-4 hover:underline"
                            href={`/employer/vacancies/${a.vacancy.id}/applications`}
                          >
                            {a.vacancy.title}
                          </Link>
                          <div className="text-[11px] text-white/40">{a.vacancy.city?.name ?? ''}</div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-white/55">
                          {formatRelativeTimeRu(a.createdAt)}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                              statusTone(a.status),
                            )}
                          >
                            {statusRu(a.status)}
                          </span>
                        </td>
                        <td className="rounded-r-[14px] px-3 py-2 text-right">
                          <RowActionsMenu a={a} onStatus={updateStatus} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / tablet cards */}
            <div className="space-y-2 xl:hidden">
              {apps.map((a) => {
                const rn = Number(a.worker.ratingScore);
                return (
                  <div key={a.id} className={cn(rowCardCls(), 'flex gap-3')}>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="font-medium text-white/95">
                        {a.worker.firstName} {a.worker.lastName}
                      </div>
                      <Link
                        className="text-sm text-emerald-200/90 underline-offset-2 hover:underline"
                        href={`/employer/vacancies/${a.vacancy.id}/applications`}
                      >
                        {a.vacancy.title}
                      </Link>
                      <div className="text-[11px] text-white/40">
                        {formatRelativeTimeRu(a.createdAt)} ·{' '}
                        {!Number.isNaN(rn) ? `★ ${rn.toFixed(1)}` : 'без рейтинга'}
                      </div>
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold',
                          statusTone(a.status),
                        )}
                      >
                        {statusRu(a.status)}
                      </span>
                    </div>
                    <RowActionsMenu a={a} onStatus={updateStatus} />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-white/60">
            <span>Всего: {meta.total}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                className="rounded-lg border border-white/15 px-3 py-1.5 hover:bg-white/5 disabled:opacity-40"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Назад
              </button>
              <span>
                {page} / {Math.max(1, meta.totalPages)}
              </span>
              <button
                type="button"
                disabled={page >= meta.totalPages}
                className="rounded-lg border border-white/15 px-3 py-1.5 hover:bg-white/5 disabled:opacity-40"
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              >
                Вперёд
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function RowActionsMenu({
  a,
  onStatus,
}: {
  a: ApplicationRow;
  onStatus: (id: string, st: 'confirmed' | 'rejected') => void;
}) {
  const canRespond = ['pending', 'viewed', 'invited', 'interview'].includes(a.status);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-white/55 hover:bg-white/10 hover:text-white"
          aria-label="Действия"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="z-[80] min-w-[208px] rounded-xl border border-white/10 bg-[#111f18] py-2 shadow-xl" sideOffset={4}>
          <DropdownMenu.Item asChild>
            <Link href={`/workers/${a.worker.id}`} className="block px-4 py-2 text-sm outline-none hover:bg-white/10">
              Открыть профиль
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="cursor-default px-4 py-2 outline-none"
            onSelect={(ev) => ev.preventDefault()}
          >
            {a.worker.userId ? (
              <OpenChatButton
                recipientUserId={a.worker.userId}
                context={{ type: 'APPLICATION', id: a.id }}
                label="Открыть чат"
                className="flex w-full justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-40"
              />
            ) : null}
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-2 h-px bg-white/10" />
          <DropdownMenu.Item
            className="cursor-pointer px-4 py-2 text-sm outline-none hover:bg-emerald-500/20 disabled:opacity-40"
            disabled={!canRespond}
            onSelect={(ev) => {
              ev.preventDefault();
              void onStatus(a.id, 'confirmed');
            }}
          >
            Принять
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="cursor-pointer px-4 py-2 text-sm outline-none hover:bg-red-500/25 disabled:opacity-40"
            disabled={['rejected', 'cancelled'].includes(a.status)}
            onSelect={(ev) => {
              ev.preventDefault();
              void onStatus(a.id, 'rejected');
            }}
          >
            Отклонить
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
