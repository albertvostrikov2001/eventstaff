'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { MoreHorizontal, Search, RefreshCw } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { APPLICATION_STATUSES } from '@unity/shared';
import { cn } from '@/lib/utils';
import { OpenChatButton } from '@/components/chat/OpenChatButton';
import { ShiftGuidelinesModal } from '@/components/shifts/ShiftGuidelinesModal';
import { NextStepReminderModal } from '@/components/shifts/NextStepReminderModal';
import { formatRelativeTimeRu } from '@/lib/format-relative-ru';
import { ResponsiveTable, type Column } from '@/components/ui/ResponsiveTable';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { PhotoLightbox } from '@/components/media/PhotoLightbox';
import { Button } from '@/components/ui/button';

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

const CHAT_READY_STATUSES = new Set(['confirmed', 'shift_started', 'completed', 'invited', 'interview']);

function rowCardCls() {
  return 'rounded-[14px] border border-white/[0.08] bg-white/[0.04] px-4 py-3';
}

export function EmployerApplicationsPageClient() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
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
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [confirmMemoId, setConfirmMemoId] = useState<string | null>(null);
  const [showReminder, setShowReminder] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkWorking, setBulkWorking] = useState(false);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    const s = searchParams.get('status');
    if (s) setStatus(s);
  }, [searchParams]);

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

  const bulkAction = useCallback(
    async (action: 'reject' | 'interview') => {
      if (selectedIds.size === 0) return;
      setBulkWorking(true);
      try {
        const res = await apiClient.patch<{ data: { updated: number } }>(
          '/employer/applications/bulk',
          { ids: Array.from(selectedIds), action },
        );
        toast(`Обновлено откликов: ${res.data.updated}`, 'success');
        setSelectedIds(new Set());
        void fetchList();
      } catch (e) {
        toast(e instanceof ApiError ? e.message : 'Не удалось выполнить действие', 'error');
      } finally {
        setBulkWorking(false);
      }
    },
    [selectedIds, toast, fetchList],
  );

  const updateStatus = useCallback(
    async (id: string, st: 'confirmed' | 'rejected' | 'interview'): Promise<boolean> => {
      setStatusUpdatingId(id);
      try {
        await apiClient.patch(`/employer/applications/${id}/status`, { status: st });
        setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status: st } : a)));
        toast(
          st === 'confirmed'
            ? 'Отклик принят. Теперь вы можете начать общение.'
            : st === 'interview'
              ? 'Статус «На связи». Откройте чат, чтобы обсудить детали.'
              : 'Отклик отклонён',
          'success',
        );
        return true;
      } catch (e) {
        toast(
          e instanceof ApiError ? e.message : 'Не удалось обновить статус',
          'error',
        );
        return false;
      } finally {
        setStatusUpdatingId(null);
      }
    },
    [toast],
  );

  // Accepting an applicant assigns a shift — show the employer guidelines memo first.
  const requestStatus = useCallback(
    (id: string, st: 'confirmed' | 'rejected' | 'interview') => {
      if (st === 'confirmed') {
        setConfirmMemoId(id);
      } else {
        void updateStatus(id, st);
      }
    },
    [updateStatus],
  );

  const confirmFromMemo = useCallback(async () => {
    const id = confirmMemoId;
    if (!id) return;
    const ok = await updateStatus(id, 'confirmed');
    setConfirmMemoId(null);
    if (ok) setShowReminder(true);
  }, [confirmMemoId, updateStatus]);

  const statusTone = (s: string) => {
    if (s === 'rejected') return 'bg-red-500/15 text-red-200 ring-1 ring-red-500/30';
    if (['confirmed', 'completed', 'shift_started'].includes(s)) {
      return 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30';
    }
    return 'bg-amber-500/12 text-amber-100 ring-1 ring-amber-500/25';
  };

  const statusRu = (s: string): string =>
    (APPLICATION_STATUSES as Record<string, string>)[s] ?? s;

  const columns = useMemo((): Column<ApplicationRow>[] => {
    return [
      {
        key: 'select',
        header: '',
        render: (a) => (
          <input
            type="checkbox"
            checked={selectedIds.has(a.id)}
            onChange={() => toggleSelect(a.id)}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 cursor-pointer accent-emerald-500"
            aria-label="Выбрать отклик"
          />
        ),
      },
      {
        key: 'worker',
        header: 'Работник',
        render: (a) => {
          const rn = Number(a.worker.ratingScore);
          const name = `${a.worker.firstName} ${a.worker.lastName}`.trim();
          return (
            <div className="flex items-center gap-3">
              <PhotoLightbox src={a.worker.photoUrl} alt={name} className="rounded-full" disabled={!a.worker.photoUrl}>
                <UserAvatar src={a.worker.photoUrl} name={name || 'Работник'} size={48} />
              </PhotoLightbox>
              <div>
                <div className="font-medium text-white/95">{name || 'Работник'}</div>
                <div className="text-xs text-white/45">{!Number.isNaN(rn) ? `★ ${rn.toFixed(1)}` : '—'}</div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'vacancy',
        header: 'Вакансия',
        render: (a) => (
          <>
            <Link
              className="text-emerald-200/90 underline-offset-4 hover:underline"
              href={`/employer/vacancies/${a.vacancy.id}/applications`}
            >
              {a.vacancy.title}
            </Link>
            <div className="text-[11px] text-white/40">{a.vacancy.city?.name ?? ''}</div>
          </>
        ),
      },
      {
        key: 'responded',
        header: 'Дата отклика',
        render: (a) => <span className="whitespace-nowrap text-white/55">{formatRelativeTimeRu(a.createdAt)}</span>,
      },
      {
        key: 'status',
        header: 'Статус',
        render: (a) => (
          <span
            className={cn(
              'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
              statusTone(a.status),
            )}
          >
            {statusRu(a.status)}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Действия',
        className: 'text-right',
        render: (a) => (
          <RowActionsMenu
            a={a}
            onStatus={requestStatus}
            statusUpdatingId={statusUpdatingId}
            chatReady={CHAT_READY_STATUSES.has(a.status)}
          />
        ),
      },
    ];
  }, [requestStatus, statusUpdatingId, selectedIds, toggleSelect]);

  const mobileCard = useMemo(
    () => ({
      title: (a: ApplicationRow) => {
        const rn = Number(a.worker.ratingScore);
        const name = `${a.worker.firstName} ${a.worker.lastName}`.trim() || 'Работник';
        return (
          <div className="flex min-w-0 items-center gap-2">
            <PhotoLightbox src={a.worker.photoUrl} alt={name} className="rounded-full" disabled={!a.worker.photoUrl}>
              <UserAvatar src={a.worker.photoUrl} name={name} size={48} />
            </PhotoLightbox>
            <div className="min-w-0">
              <div className="truncate font-medium text-white">{name}</div>
              <div className="text-xs text-white/45">{!Number.isNaN(rn) ? `★ ${rn.toFixed(1)}` : '—'}</div>
            </div>
          </div>
        );
      },
      subtitle: (a: ApplicationRow) => (
        <Link
          className="text-sm text-emerald-200/90 underline-offset-2 hover:underline"
          href={`/employer/vacancies/${a.vacancy.id}/applications`}
        >
          {a.vacancy.title}
        </Link>
      ),
      badge: (a: ApplicationRow) => (
        <span
          className={cn('inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold', statusTone(a.status))}
        >
          {statusRu(a.status)}
        </span>
      ),
      meta: (a: ApplicationRow) => <span className="text-white/40">{formatRelativeTimeRu(a.createdAt)}</span>,
      actions: (a: ApplicationRow) => (
        <ApplicationMobileActions
          a={a}
          onStatus={requestStatus}
          statusUpdatingId={statusUpdatingId}
          chatReady={CHAT_READY_STATUSES.has(a.status)}
        />
      ),
    }),
    [requestStatus, statusUpdatingId],
  );

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
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
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

      {error ? (
        <div className="mt-10 flex flex-col items-center gap-3 text-white/65">
          <p>Не удалось загрузить отклики</p>
          <Button
            type="button"
            variant="muted"
            onClick={() => void fetchList()}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Попробовать снова
          </Button>
        </div>
      ) : (
        <>
          {selectedIds.size > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-3 rounded-[12px] border border-emerald-500/25 bg-emerald-500/[0.06] px-4 py-3">
              <span className="text-sm font-medium text-white/85">
                Выбрано: {selectedIds.size}
              </span>
              <div className="ml-auto flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="muted"
                  size="sm"
                  disabled={bulkWorking}
                  onClick={() => void bulkAction('interview')}
                >
                  Связаться
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  disabled={bulkWorking}
                  onClick={() => void bulkAction('reject')}
                >
                  Отклонить выбранные
                </Button>
                <Button
                  type="button"
                  variant="ghostInverse"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Сбросить
                </Button>
              </div>
            </div>
          )}
          <div className="mt-8">
            <ResponsiveTable
              data={apps}
              columns={columns}
              mobileCard={mobileCard}
              keyExtractor={(a) => a.id}
              isLoading={loading}
              skeletonRows={5}
              variant="dark"
              emptyState={
                <div className={`flex flex-col items-center gap-3 py-16 text-center ${rowCardCls()} mt-8`}>
                  <Search className="h-10 w-10 text-white/40" />
                  <p className="text-sm text-white/55">
                    По выбранным условиям откликов нет. Измените фильтры или{' '}
                    <Link href="/employer/vacancies/new" className="text-emerald-300 hover:underline">
                      создайте вакансию
                    </Link>
                  </p>
                </div>
              }
            />
          </div>

          {!loading && apps.length > 0 ? (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-white/60">
              <span>Всего: {meta.total}</span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="muted"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Назад
                </Button>
                <span>
                  {page} / {Math.max(1, meta.totalPages)}
                </span>
                <Button
                  type="button"
                  variant="muted"
                  size="sm"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                >
                  Вперёд
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}

      {confirmMemoId && (
        <ShiftGuidelinesModal
          variant="employer"
          confirmLabel="Понятно, назначить смену"
          loading={statusUpdatingId === confirmMemoId}
          onConfirm={() => void confirmFromMemo()}
          onClose={() => setConfirmMemoId(null)}
        />
      )}

      {showReminder && (
        <NextStepReminderModal variant="employer" onClose={() => setShowReminder(false)} />
      )}
    </div>
  );
}

function ApplicationMobileActions({
  a,
  onStatus,
  statusUpdatingId,
  chatReady,
}: {
  a: ApplicationRow;
  onStatus: (id: string, st: 'confirmed' | 'rejected' | 'interview') => void;
  statusUpdatingId: string | null;
  chatReady: boolean;
}) {
  const canRespond = ['pending', 'viewed', 'invited', 'interview'].includes(a.status);
  const canContact = ['pending', 'viewed'].includes(a.status);

  return (
    <div className="flex w-full flex-wrap gap-2">
      <Link
        href={`/workers/${a.worker.id}`}
        className="inline-flex flex-1 min-w-[120px] items-center justify-center rounded-[10px] border border-white/15 bg-white/[0.06] px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/10"
      >
        Профиль
      </Link>
      {canContact && (
        <Button
          type="button"
          variant="muted"
          disabled={statusUpdatingId === a.id}
          onClick={() => void onStatus(a.id, 'interview')}
          className="inline-flex min-w-[120px] flex-1 justify-center rounded-[10px] py-2 text-sm disabled:opacity-40"
        >
          Связаться
        </Button>
      )}
      {chatReady && a.worker.userId ? (
        <OpenChatButton
          recipientUserId={a.worker.userId}
          context={{ type: 'APPLICATION', id: a.id }}
          forceVisible
          label="Написать"
          className="inline-flex flex-1 min-w-[120px] justify-center rounded-[10px] border border-emerald-500/35 bg-emerald-500/15 px-3 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-40"
        />
      ) : null}
      <Button
        type="button"
        variant="primary"
        disabled={!canRespond || statusUpdatingId === a.id}
        onClick={() => void onStatus(a.id, 'confirmed')}
        className="inline-flex min-w-[120px] flex-1 justify-center rounded-[10px] py-2 text-sm disabled:opacity-40"
      >
        Принять
      </Button>
      <Button
        type="button"
        variant="danger"
        disabled={['rejected', 'cancelled'].includes(a.status)}
        onClick={() => void onStatus(a.id, 'rejected')}
        className="inline-flex min-w-[120px] flex-1 justify-center rounded-[10px] py-2 text-sm opacity-100 disabled:opacity-40"
      >
        Отклонить
      </Button>
    </div>
  );
}

function RowActionsMenu({
  a,
  onStatus,
  statusUpdatingId,
  chatReady,
}: {
  a: ApplicationRow;
  onStatus: (id: string, st: 'confirmed' | 'rejected' | 'interview') => void;
  statusUpdatingId: string | null;
  chatReady: boolean;
}) {
  const canRespond = ['pending', 'viewed', 'invited', 'interview'].includes(a.status);
  const canContact = ['pending', 'viewed'].includes(a.status);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button
          type="button"
          variant="ghostInverse"
          size="icon"
          className="h-9 w-9 rounded-xl text-white/55 hover:bg-white/10 hover:text-white"
          aria-label="Действия"
        >
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="cabinet-dropdown-content z-[80] min-w-[208px] py-2"
          sideOffset={4}
        >
          <DropdownMenu.Item asChild>
            <Link
              href={`/workers/${a.worker.id}`}
              className="cabinet-dropdown-item block"
            >
              Открыть профиль
            </Link>
          </DropdownMenu.Item>
          {chatReady && a.worker.userId ? (
            <DropdownMenu.Item
              className="cursor-default px-4 py-2 outline-none"
              onSelect={(ev) => ev.preventDefault()}
            >
              <OpenChatButton
                recipientUserId={a.worker.userId}
                context={{ type: 'APPLICATION', id: a.id }}
                forceVisible
                label="Написать"
                className="cabinet-dropdown-item flex w-full justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-40"
              />
            </DropdownMenu.Item>
          ) : null}
          <DropdownMenu.Separator className="cabinet-dropdown-separator my-2 h-px" />
          {canContact && (
            <DropdownMenu.Item
              className="cabinet-dropdown-item cursor-pointer disabled:opacity-40"
              disabled={statusUpdatingId === a.id}
              onSelect={(ev) => {
                ev.preventDefault();
                void onStatus(a.id, 'interview');
              }}
            >
              Связаться (на связи)
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Item
            className="cabinet-dropdown-item cursor-pointer disabled:opacity-40"
            disabled={!canRespond || statusUpdatingId === a.id}
            onSelect={(ev) => {
              ev.preventDefault();
              void onStatus(a.id, 'confirmed');
            }}
          >
            Принять
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="cabinet-dropdown-item cabinet-dropdown-item--danger cursor-pointer disabled:opacity-40"
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
