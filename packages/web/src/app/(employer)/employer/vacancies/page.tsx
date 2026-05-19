'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  RATE_TYPES,
  STAFF_CATEGORIES,
  type EmployerVacancyListQuery,
} from '@unity/shared';
import {
  Calendar,
  ClipboardList,
  Copy,
  Loader2,
  MapPin,
  MoreHorizontal,
  Pause,
  Play,
  RotateCcw,
  Search,
  Users,
} from 'lucide-react';
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/modal';
import { ApiError, apiClient } from '@/lib/api/client';
import { formatDateTimeRu } from '@/lib/dates/formatDateTime';
import { useToast } from '@/components/ui/toast-context';

type VacancyTab = EmployerVacancyListQuery['tab'];
type InnerStatusFilter = Exclude<EmployerVacancyListQuery['vacancyStatus'], undefined>;
type VacancySort = EmployerVacancyListQuery['sort'];

interface VacancyListItem {
  id: string;
  title: string;
  category: string;
  status: string;
  dateStart: string;
  coverImageUrl: string | null;
  rate: string;
  rateType: string;
  city: { name: string } | null;
  _count: { applications: number };
}

interface ListPayload {
  data: VacancyListItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

function badge(status: string) {
  const map: Record<string, { emoji: string; label: string; cls: string }> = {
    active: { emoji: '🟢', label: 'Активна', cls: 'bg-emerald-500/15 text-emerald-100 border-emerald-500/35' },
    paused: {
      emoji: '⏸',
      label: 'На паузе',
      cls: 'border-amber-400/35 bg-amber-500/15 text-amber-100',
    },
    draft: { emoji: '📝', label: 'Черновик', cls: 'border-white/15 bg-white/[0.06] text-white/80' },
    archived: {
      emoji: '📦',
      label: 'В архиве',
      cls: 'border-white/12 bg-white/[0.05] text-white/55',
    },
    closed: { emoji: '✓', label: 'Закрыта', cls: 'border-emerald-800/40 bg-black/25 text-emerald-100/80' },
    pending_moderation: {
      emoji: '⏳',
      label: 'На модерации',
      cls: 'border-sky-500/35 bg-sky-500/10 text-sky-100',
    },
    rejected: { emoji: '✕', label: 'Отклонена', cls: 'border-red-400/35 bg-red-500/15 text-red-100' },
  };
  const b = map[status];
  return (
    b ?? {
      emoji: '•',
      label: status,
      cls: 'border-white/10 bg-white/[0.05] text-white/65',
    }
  );
}

export default function EmployerVacanciesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = useState<VacancyTab>('live');
  const [innerStatus, setInnerStatus] = useState<InnerStatusFilter>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState<VacancySort>('newest');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [list, setList] = useState<VacancyListItem[]>([]);
  const [meta, setMeta] = useState<ListPayload['meta'] | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<VacancyListItem | null>(null);
  const [archiveWorking, setArchiveWorking] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => window.clearTimeout(t);
  }, [search]);

  const params = useMemo(
    (): Record<string, string | number> => ({
      tab,
      page,
      perPage: 12,
      sort,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(tab === 'live' && innerStatus !== 'all' ? { vacancyStatus: innerStatus } : {}),
    }),
    [tab, page, sort, debouncedSearch, innerStatus],
  );

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    apiClient
      .get<ListPayload>('/employer/vacancies', params as Record<string, string | number | boolean | undefined>)
      .then((res) => {
        setList(res.data);
        setMeta(res.meta);
      })
      .catch(() => {
        setError('Не удалось загрузить список. Проверьте соединение и попробуйте снова.');
        setList([]);
        setMeta(null);
      })
      .finally(() => setLoading(false));
  }, [params]);

  useEffect(() => load(), [load]);

  const doPause = async (id: string) => {
    try {
      await apiClient.patch(`/employer/vacancies/${id}/pause`);
      toast('Вакансия приостановлена', 'success');
      load();
    } catch (e: unknown) {
      toast(e instanceof ApiError ? e.message : 'Не удалось поставить на паузу', 'error');
    }
  };

  const doResume = async (id: string) => {
    try {
      await apiClient.patch(`/employer/vacancies/${id}/resume`);
      toast('Вакансия снова активна', 'success');
      load();
    } catch (e: unknown) {
      toast(e instanceof ApiError ? e.message : 'Не удалось возобновить', 'error');
    }
  };

  const runArchive = async (id: string) => {
    await apiClient.patch(`/employer/vacancies/${id}/archive`);
    toast('Вакансия в архиве', 'success');
    load();
  };

  const requestArchive = (v: VacancyListItem) => {
    if (v._count.applications > 0) setArchiveTarget(v);
    else void runArchive(v.id).catch((e: unknown) => {
      toast(e instanceof ApiError ? e.message : 'Ошибка архивирования', 'error');
    });
  };

  const archiveConfirm = async () => {
    if (!archiveTarget) return;
    setArchiveWorking(true);
    try {
      await runArchive(archiveTarget.id);
      setArchiveTarget(null);
    } catch (e: unknown) {
      toast(e instanceof ApiError ? e.message : 'Ошибка архивирования', 'error');
    } finally {
      setArchiveWorking(false);
    }
  };

  const doUnarchive = async (id: string) => {
    try {
      await apiClient.patch(`/employer/vacancies/${id}/unarchive`);
      toast('Вакансия возвращена в работу', 'success');
      setTab('live');
      load();
    } catch (e: unknown) {
      const err = e instanceof ApiError ? e : null;
      if (err?.code === 'START_AT_PAST') {
        toast(err.message, 'error');
        router.push(`/employer/vacancies/${id}/edit`);
      } else toast(err?.message ?? 'Не удалось вернуть из архива', 'error');
    }
  };

  const doDuplicate = async (id: string) => {
    try {
      const res = await apiClient.post<{ data: { id: string } }>('/employer/vacancies/duplicate', {
        sourceId: id,
      });
      toast('Копия создана черновиком', 'success');
      router.push(`/employer/vacancies/${res.data.id}/edit`);
    } catch (e: unknown) {
      toast(e instanceof ApiError ? e.message : 'Ошибка дублирования', 'error');
    }
  };

  const tabBtn = (k: VacancyTab, label: string) => (
    <button
      type="button"
      onClick={() => {
        setTab(k);
        setPage(1);
      }}
      className={
        tab === k
          ? 'border-b-[3px] border-[color:var(--u-emerald,#2d6a4a)] px-1 pb-3 text-[15px] font-semibold text-white'
          : 'border-b-[3px] border-transparent px-1 pb-3 text-[15px] font-medium text-white/50 transition hover:text-white/80'
      }
    >
      {label}
    </button>
  );

  const emptyCopy =
    tab === 'live'
      ? 'У вас пока нет активных вакансий'
      : tab === 'archived'
        ? 'Архив пуст'
        : '';

  const innerOpts: { key: InnerStatusFilter; label: string }[] = [
    { key: 'all', label: 'Все статусы' },
    { key: 'active', label: 'Активна' },
    { key: 'paused', label: 'На паузе' },
    { key: 'draft', label: 'Черновик' },
  ];

  const sortOpts: { key: VacancySort; label: string }[] = [
    { key: 'newest', label: 'Сначала новые' },
    { key: 'oldest', label: 'Сначала старые' },
    { key: 'startAt', label: 'По дате начала' },
  ];

  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[1.65rem] font-bold tracking-tight text-white">Мои вакансии</h1>
          <p className="mt-1 text-sm text-white/50">Списком, фильтрами и архивом</p>
        </div>
        <Link
          href="/employer/vacancies/new"
          className="inline-flex shrink-0 items-center justify-center rounded-[10px] bg-unity-gradient-primary px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(45,106,74,0.35)] transition hover:brightness-[1.06]"
        >
          Создать вакансию
        </Link>
      </div>

      <nav className="mt-10 flex gap-10 border-b border-white/[0.08]" aria-label="Раздел">
        {tabBtn('live', 'Активные')}
        {tabBtn('archived', 'Архивные')}
      </nav>

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-[220px] flex-1 max-w-xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Поиск по названию"
            className="w-full rounded-[12px] border border-white/[0.08] bg-white/[0.04] py-2.5 pl-11 pr-4 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-[#2d6a4a]/45"
          />
        </div>
        {tab === 'live' && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-white/38">Статус</span>
            <select
              value={innerStatus}
              onChange={(e) => {
                setInnerStatus(e.target.value as InnerStatusFilter);
                setPage(1);
              }}
              className="cabinet-select-chevron min-h-[42px] rounded-[12px] border border-white/[0.10] bg-white/[0.04] px-4 text-sm font-medium text-white"
            >
              {innerOpts.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-white/38">Сортировка</span>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as VacancySort);
              setPage(1);
            }}
            className="cabinet-select-chevron min-h-[42px] min-w-[200px] rounded-[12px] border border-white/[0.10] bg-white/[0.04] px-4 text-sm font-medium text-white"
          >
            {sortOpts.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mt-8 rounded-[14px] border border-red-400/35 bg-red-500/15 px-4 py-3 text-sm text-red-50">
          {error}{' '}
          <button
            type="button"
            onClick={load}
            className="ml-2 font-semibold text-white underline underline-offset-2 hover:text-white/85"
          >
            Повторить
          </button>
        </div>
      )}

      <div className="mt-8">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="skeleton-dark h-[200px] w-full rounded-[16px] border border-white/[0.06]"
              />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center rounded-[18px] border border-white/[0.08] bg-white/[0.03] py-16 text-center">
            <ClipboardList className="mb-3 h-10 w-10 text-white/28" aria-hidden />
            <p className="text-[15px] font-semibold text-white/82">{emptyCopy}</p>
            {tab === 'live' && (
              <Link
                href="/employer/vacancies/new"
                className="mt-5 rounded-[10px] bg-unity-gradient-primary px-6 py-2.5 text-sm font-semibold text-white hover:brightness-110"
              >
                Создать вакансию
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {list.map((v) => {
              const b = badge(v.status);
              const cover = v.coverImageUrl ?? null;
              return (
                <div
                  key={v.id}
                  className="group flex gap-4 overflow-hidden rounded-[16px] border border-white/[0.08] bg-white/[0.03] p-4 transition hover:border-emerald-500/25 hover:bg-white/[0.045] sm:p-5"
                >
                  <Link
                    href={`/employer/vacancies/${v.id}`}
                    className="relative h-[120px] w-[120px] shrink-0 overflow-hidden rounded-[14px] border border-white/[0.08] bg-white/[0.04]"
                  >
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt=""
                        src={cover}
                        className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] font-medium uppercase tracking-wide text-white/25">
                        <Calendar className="h-7 w-7 opacity-70" aria-hidden />
                        UNITY
                      </div>
                    )}
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/employer/vacancies/${v.id}`}
                          className="break-words text-[16px] font-semibold leading-snug text-white transition hover:text-emerald-200"
                        >
                          {v.title}
                        </Link>
                        <span
                          className={`mt-2 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${b.cls}`}
                        >
                          <span aria-hidden>{b.emoji}</span>
                          {b.label}
                        </span>
                      </div>
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <button
                            type="button"
                            className="rounded-[10px] border border-white/[0.08] bg-white/[0.04] p-2 text-white/70 transition hover:border-white/[0.16] hover:bg-white/[0.07]"
                            aria-label="Действия"
                          >
                            <MoreHorizontal className="h-4 w-4" aria-hidden />
                          </button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content
                            className="z-[120] min-w-[220px] rounded-[14px] border border-white/12 bg-[#111f18] py-2 shadow-xl"
                            sideOffset={6}
                          >
                            <DropdownMenu.Item asChild>
                              <Link
                                href={`/employer/vacancies/${v.id}`}
                                className="block cursor-pointer px-4 py-2.5 text-sm text-white outline-none hover:bg-white/[0.06]"
                              >
                                Просмотр
                              </Link>
                            </DropdownMenu.Item>
                            <DropdownMenu.Item asChild>
                              <Link
                                href={`/employer/vacancies/${v.id}/edit`}
                                className="block cursor-pointer px-4 py-2.5 text-sm text-white outline-none hover:bg-white/[0.06]"
                              >
                                Редактировать
                              </Link>
                            </DropdownMenu.Item>
                            <DropdownMenu.Item asChild>
                              <Link
                                href={`/employer/vacancies/${v.id}/applications`}
                                className="block cursor-pointer px-4 py-2.5 text-sm text-white outline-none hover:bg-white/[0.06]"
                              >
                                Отклики
                              </Link>
                            </DropdownMenu.Item>
                            {v.status === 'active' && (
                              <DropdownMenu.Item
                                onSelect={(e) => e.preventDefault()}
                                className="cursor-pointer px-4 py-2.5 text-sm text-white outline-none hover:bg-white/[0.06]"
                                onClick={() => doPause(v.id)}
                              >
                                <span className="flex items-center gap-2">
                                  <Pause className="h-3.5 w-3.5" aria-hidden /> На паузу
                                </span>
                              </DropdownMenu.Item>
                            )}
                            {v.status === 'paused' && (
                              <DropdownMenu.Item
                                onSelect={(e) => e.preventDefault()}
                                className="cursor-pointer px-4 py-2.5 text-sm text-white outline-none hover:bg-white/[0.06]"
                                onClick={() => doResume(v.id)}
                              >
                                <span className="flex items-center gap-2">
                                  <Play className="h-3.5 w-3.5" aria-hidden /> Возобновить
                                </span>
                              </DropdownMenu.Item>
                            )}
                            <DropdownMenu.Item
                              onSelect={(e) => e.preventDefault()}
                              className="cursor-pointer px-4 py-2.5 text-sm text-white outline-none hover:bg-white/[0.06]"
                              onClick={() => doDuplicate(v.id)}
                            >
                              <span className="flex items-center gap-2">
                                <Copy className="h-3.5 w-3.5" aria-hidden /> Дублировать
                              </span>
                            </DropdownMenu.Item>
                            {v.status !== 'archived' && (
                              <DropdownMenu.Item
                                onSelect={(e) => {
                                  e.preventDefault();
                                  requestArchive(v);
                                }}
                                className="cursor-pointer px-4 py-2.5 text-sm text-white outline-none hover:bg-white/[0.06]"
                              >
                                Архивировать
                              </DropdownMenu.Item>
                            )}
                            {v.status === 'archived' && (
                              <DropdownMenu.Item
                                onSelect={(e) => {
                                  e.preventDefault();
                                  void doUnarchive(v.id);
                                }}
                                className="cursor-pointer px-4 py-2.5 text-sm text-white outline-none hover:bg-white/[0.06]"
                              >
                                <span className="flex items-center gap-2">
                                  <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Вернуть из архива
                                </span>
                              </DropdownMenu.Item>
                            )}
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                        </DropdownMenu.Root>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-white/55">
                      <span>
                        {STAFF_CATEGORIES[v.category as keyof typeof STAFF_CATEGORIES] ?? v.category}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 shrink-0 text-white/35" aria-hidden />
                        {formatDateTimeRu(v.dateStart, 'short')}
                      </span>
                      {v.city && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-white/35" aria-hidden />
                          {v.city.name}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 shrink-0 text-white/35" aria-hidden />
                        {v._count.applications}
                      </span>
                      <span className="font-medium text-white/78">
                        {Number(v.rate).toLocaleString('ru-RU')} ₽ —{' '}
                        {RATE_TYPES[v.rateType as keyof typeof RATE_TYPES] ?? v.rateType}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4 text-sm text-white/60">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-[10px] border border-white/12 px-4 py-2 disabled:opacity-35"
          >
            Назад
          </button>
          <span>
            Стр. {page} / {meta.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= meta.totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-[10px] border border-white/12 px-4 py-2 disabled:opacity-35"
          >
            Вперёд
          </button>
        </div>
      )}

      <Modal open={archiveTarget !== null} onOpenChange={(o) => !o && setArchiveTarget(null)}>
        <ModalContent className="max-w-[440px] border border-white/[0.1] bg-[#111f18] text-white [&>button]:text-white/60 [&>button]:hover:text-white">
          <ModalHeader>
            <ModalTitle className="text-white">
              Отправить «{archiveTarget?.title.slice(0, 48)}
              {(archiveTarget?.title.length ?? 0) > 48 ? '…' : ''}» в архив?
            </ModalTitle>
            <ModalDescription className="text-white/62">
              {archiveTarget != null && archiveTarget._count.applications > 0 ? (
                <>
                  У этой вакансии {archiveTarget._count.applications}{' '}
                  {archiveTarget._count.applications === 1
                    ? 'отклик'
                    : archiveTarget._count.applications < 5
                      ? 'отклика'
                      : 'откликов'}
                  . Она будет скрыта из публичного каталога, но история откликов останется. Продолжить?
                </>
              ) : (
                <>Вакансия будет скрыта из каталога. Её можно вернуть позже из архива.</>
              )}
            </ModalDescription>
          </ModalHeader>
          <ModalFooter className="gap-2 sm:space-x-0">
            <ModalClose className="inline-flex min-h-[40px] items-center justify-center rounded-[10px] border border-white/[0.12] px-5 text-sm text-white/82 hover:bg-white/[0.05]">
              Отмена
            </ModalClose>
            <button
              type="button"
              disabled={archiveWorking}
              onClick={archiveConfirm}
              className="inline-flex min-h-[40px] items-center justify-center rounded-[10px] bg-emerald-800/95 px-5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-45"
            >
              {archiveWorking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'В архив'}
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
