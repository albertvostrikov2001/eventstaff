'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  EMPLOYMENT_TYPES,
  RATE_TYPES,
  STAFF_CATEGORIES,
  VACANCY_STATUSES,
} from '@unity/shared';
import {
  ArrowLeft,
  Calendar,
  Copy,
  Loader2,
  MoreHorizontal,
  Pause,
  Play,
  RotateCcw,
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

interface VacancyDetail {
  id: string;
  title: string;
  status: string;
  category: string;
  employmentType: string;
  rate: string;
  rateType: string;
  description: string | null;
  requirements: string | null;
  responsibilities: string | null;
  tags: unknown;
  coverImageUrl?: string | null;
  city: { id: string; name: string } | null;
  dateStart: string;
  dateEnd: string | null;
  workersNeeded: number;
  createdAt: string;
  updatedAt: string;
  isUrgent: boolean;
}

function parseTags(t: unknown): string[] {
  if (!Array.isArray(t)) return [];
  return t.filter((x): x is string => typeof x === 'string');
}

export function EmployerVacancyDetailClient() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [vacancy, setVacancy] = useState<VacancyDetail | null>(null);
  const [apps, setApps] = useState(0);
  const [loading, setLoading] = useState(true);
  const [archiveTargetOpen, setArchiveTargetOpen] = useState(false);
  const [archiveWorking, setArchiveWorking] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    apiClient
      .get<{ data: VacancyDetail & { _count?: { applications?: number } } }>(`/employer/vacancies/${id}`)
      .then((r) => {
        setVacancy(r.data);
        setApps(typeof r.data._count?.applications === 'number' ? r.data._count.applications : 0);
      })
      .catch(() => toast('Не удалось загрузить вакансию', 'error'))
      .finally(() => setLoading(false));
  }, [id, toast]);

  useEffect(() => reload(), [reload]);

  const tagList = useMemo(() => (vacancy ? parseTags(vacancy.tags) : []), [vacancy]);

  const sendArchiveRequest = useCallback(async () => {
    if (!vacancy) return;
    await apiClient.patch(`/employer/vacancies/${vacancy.id}/archive`);
    toast('Вакансия в архиве', 'success');
    reload();
  }, [vacancy, toast, reload]);

  const archiveFromModalConfirm = async () => {
    setArchiveWorking(true);
    try {
      await sendArchiveRequest();
      setArchiveTargetOpen(false);
    } catch (e: unknown) {
      toast(e instanceof ApiError ? e.message : 'Ошибка архивирования', 'error');
    } finally {
      setArchiveWorking(false);
    }
  };

  const requestArchiveUi = () => {
    if (!vacancy) return;
    if (apps > 0) setArchiveTargetOpen(true);
    else
      void sendArchiveRequest().catch((e: unknown) =>
        toast(e instanceof ApiError ? e.message : 'Ошибка архивирования', 'error'),
      );
  };

  const doUnarchive = async () => {
    if (!vacancy) return;
    try {
      await apiClient.patch(`/employer/vacancies/${vacancy.id}/unarchive`);
      toast('Вакансия возвращена', 'success');
      reload();
    } catch (e: unknown) {
      const err = e instanceof ApiError ? e : null;
      if (err?.code === 'START_AT_PAST') {
        toast(err.message, 'error');
        router.push(`/employer/vacancies/${vacancy.id}/edit`);
      } else toast(err?.message ?? 'Не удалось вернуть из архива', 'error');
    }
  };

  const doPause = async () => {
    if (!vacancy) return;
    try {
      await apiClient.patch(`/employer/vacancies/${vacancy.id}/pause`);
      toast('Приостановлена', 'success');
      reload();
    } catch (e: unknown) {
      toast(e instanceof ApiError ? e.message : 'Не удалось', 'error');
    }
  };

  const doResume = async () => {
    if (!vacancy) return;
    try {
      await apiClient.patch(`/employer/vacancies/${vacancy.id}/resume`);
      toast('Снова активна', 'success');
      reload();
    } catch (e: unknown) {
      toast(e instanceof ApiError ? e.message : 'Не удалось', 'error');
    }
  };

  const doDuplicate = async () => {
    if (!vacancy) return;
    try {
      const res = await apiClient.post<{ data: { id: string } }>('/employer/vacancies/duplicate', {
        sourceId: vacancy.id,
      });
      toast('Черновик-копия создан', 'success');
      router.push(`/employer/vacancies/${res.data.id}/edit`);
    } catch (e: unknown) {
      toast(e instanceof ApiError ? e.message : 'Ошибка дублирования', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-white/50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" aria-hidden />
      </div>
    );
  }

  if (!vacancy) {
    return (
      <div className="rounded-[16px] border border-white/[0.08] bg-white/[0.03] p-12 text-center text-white/70">
        Вакансия не найдена
      </div>
    );
  }

  const statusLabel =
    VACANCY_STATUSES[vacancy.status as keyof typeof VACANCY_STATUSES] ?? vacancy.status;

  const cover = vacancy.coverImageUrl ?? null;

  return (
    <div className="min-w-0">
      <Link
        href="/employer/vacancies"
        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-white/55 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        К списку вакансий
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.08] pb-8">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="break-words text-2xl font-bold text-white">{vacancy.title}</h1>
                <span className="rounded-full border border-white/[0.12] px-3 py-0.5 text-xs font-semibold text-white/70">
                  {statusLabel}
                </span>
                {vacancy.isUrgent && (
                  <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-100">
                    Срочно
                  </span>
                )}
              </div>
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-white/50">
                <span>
                  Категория:{' '}
                  <span className="text-white/75">
                    {STAFF_CATEGORIES[vacancy.category as keyof typeof STAFF_CATEGORIES] ??
                      vacancy.category}
                  </span>
                </span>
                <span>{RATE_TYPES[vacancy.rateType as keyof typeof RATE_TYPES] ?? vacancy.rateType}</span>
                <span>Создано: {formatDateTimeRu(vacancy.createdAt, 'datetime')}</span>
                <span>Обновлено: {formatDateTimeRu(vacancy.updatedAt, 'datetime')}</span>
              </p>
            </div>

            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  className="rounded-[10px] border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/80 hover:border-white/[0.18]"
                >
                  <span className="inline-flex items-center gap-2">
                    Ещё
                    <MoreHorizontal className="h-4 w-4 opacity-65" aria-hidden />
                  </span>
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="z-[130] min-w-[220px] rounded-[14px] border border-white/12 bg-[#111f18] py-2 shadow-xl"
                  sideOffset={6}
                >
                  <DropdownMenu.Item asChild>
                    <Link
                      href={`/employer/vacancies/${vacancy.id}/applications`}
                      className="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm outline-none hover:bg-white/[0.06]"
                    >
                      <Users className="h-4 w-4 shrink-0" aria-hidden /> Отклики
                    </Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item asChild>
                    <Link
                      href={`/employer/vacancies/${vacancy.id}/edit`}
                      className="block cursor-pointer px-4 py-2.5 text-sm outline-none hover:bg-white/[0.06]"
                    >
                      Редактировать
                    </Link>
                  </DropdownMenu.Item>
                  {vacancy.status === 'active' && (
                    <DropdownMenu.Item
                      onSelect={(e) => {
                        e.preventDefault();
                        void doPause();
                      }}
                      className="cursor-pointer px-4 py-2.5 text-sm outline-none hover:bg-white/[0.06]"
                    >
                      <span className="flex items-center gap-2">
                        <Pause className="h-3.5 w-3.5" aria-hidden /> На паузу
                      </span>
                    </DropdownMenu.Item>
                  )}
                  {vacancy.status === 'paused' && (
                    <DropdownMenu.Item
                      onSelect={(e) => {
                        e.preventDefault();
                        void doResume();
                      }}
                      className="cursor-pointer px-4 py-2.5 text-sm outline-none hover:bg-white/[0.06]"
                    >
                      <span className="flex items-center gap-2">
                        <Play className="h-3.5 w-3.5" aria-hidden /> Возобновить
                      </span>
                    </DropdownMenu.Item>
                  )}
                  <DropdownMenu.Item
                    onSelect={(e) => {
                      e.preventDefault();
                      void doDuplicate();
                    }}
                    className="cursor-pointer px-4 py-2.5 text-sm outline-none hover:bg-white/[0.06]"
                  >
                    <span className="flex items-center gap-2">
                      <Copy className="h-4 w-4 shrink-0" aria-hidden /> Дублировать
                    </span>
                  </DropdownMenu.Item>
                  {vacancy.status !== 'archived' && (
                    <DropdownMenu.Item
                      onSelect={(e) => {
                        e.preventDefault();
                        requestArchiveUi();
                      }}
                      className="cursor-pointer px-4 py-2.5 text-sm outline-none hover:bg-white/[0.06]"
                    >
                      Архивировать
                    </DropdownMenu.Item>
                  )}
                  {vacancy.status === 'archived' && (
                    <DropdownMenu.Item
                      onSelect={(e) => {
                        e.preventDefault();
                        void doUnarchive();
                      }}
                      className="cursor-pointer px-4 py-2.5 text-sm outline-none hover:bg-white/[0.06]"
                    >
                      <span className="flex items-center gap-2">
                        <RotateCcw className="h-4 w-4 shrink-0" aria-hidden /> Вернуть из архива
                      </span>
                    </DropdownMenu.Item>
                  )}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <article className="space-y-6">
              <div className="overflow-hidden rounded-[16px] border border-white/[0.08] bg-white/[0.03]">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt=""
                    src={cover}
                    className="max-h-[320px] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[21/9] items-center justify-center gap-3 border-b border-white/[0.06] bg-white/[0.02] text-sm text-white/35">
                    <Calendar className="h-10 w-10" aria-hidden />
                    Обложка не добавлена
                  </div>
                )}
              </div>

              <Section title="График и место">
                <dl className="grid gap-3 text-[15px] text-white/76">
                  <Def label="Дата начала" value={formatDateTimeRu(vacancy.dateStart, 'datetime')} />
                  <Def label="Дата окончания" value={vacancy.dateEnd ? formatDateTimeRu(vacancy.dateEnd, 'datetime') : '—'} />
                  <Def label="Город" value={vacancy.city?.name ?? '—'} />
                  <Def label="Ставка" value={`${Number(vacancy.rate).toLocaleString('ru-RU')} ₽`} />
                  <Def label="Нужно мест" value={String(vacancy.workersNeeded)} />
                  <Def
                    label="Тип занятости"
                    value={
                      EMPLOYMENT_TYPES[vacancy.employmentType as keyof typeof EMPLOYMENT_TYPES] ??
                      vacancy.employmentType.replace(/_/g, ' ')
                    }
                  />
                </dl>
              </Section>

              {vacancy.description && (
                <Section title="Описание">
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-white/74">
                    {vacancy.description}
                  </p>
                </Section>
              )}

              {vacancy.responsibilities && (
                <Section title="Обязанности">
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-white/74">
                    {vacancy.responsibilities}
                  </p>
                </Section>
              )}

              {vacancy.requirements && (
                <Section title="Требования">
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-white/74">
                    {vacancy.requirements}
                  </p>
                </Section>
              )}

              {tagList.length > 0 && (
                <Section title="Теги">
                  <div className="flex flex-wrap gap-2">
                    {tagList.map((t) => (
                      <span
                        key={t}
                        className="rounded-[10px] border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-50"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </Section>
              )}
            </article>

            <aside className="space-y-4 rounded-[16px] border border-white/[0.08] bg-white/[0.03] p-5">
              <h3 className="text-[15px] font-semibold text-white">Быстро</h3>
              <QuickLink href={`/employer/vacancies/${vacancy.id}/applications`}>Все отклики</QuickLink>
              <QuickLink href={`/employer/vacancies/${vacancy.id}/edit`}>Редактировать</QuickLink>
            </aside>
      </div>

      <Modal open={archiveTargetOpen} onOpenChange={setArchiveTargetOpen}>
        <ModalContent className="max-w-[440px] border border-white/[0.1] bg-[#111f18] text-white [&>button]:text-white/55 [&>button]:hover:text-white">
          <ModalHeader>
            <ModalTitle className="text-white">Архивировать вакансию?</ModalTitle>
            <ModalDescription className="text-white/62">
              {apps > 0 ? (
                <>
                  У этой вакансии {apps} откликов. Она будет скрыта из публичной выдачи, но история сохранится.
                  Продолжить?
                </>
              ) : (
                <>Вакансия будет скрыта из каталога. Вы сможете вернуть её из архива позже.</>
              )}
            </ModalDescription>
          </ModalHeader>
          <ModalFooter className="gap-2">
            <ModalClose className="inline-flex items-center rounded-[10px] border border-white/[0.12] px-4 py-2 text-sm hover:bg-white/[0.04]">
              Отмена
            </ModalClose>
            <button
              type="button"
              disabled={archiveWorking}
              onClick={archiveFromModalConfirm}
              className="inline-flex items-center rounded-[10px] bg-emerald-800/95 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {archiveWorking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'В архив'}
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 text-[16px] font-semibold uppercase tracking-[0.04em] text-white/52">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Def({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-2 border-b border-white/[0.05] pb-2 last:border-0">
      <dt className="shrink-0 text-[13px] text-white/45">{label}</dt>
      <dd className="min-w-0 break-words text-white/82">{value}</dd>
    </div>
  );
}

function QuickLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block rounded-[10px] border border-white/[0.1] px-4 py-2.5 text-sm font-semibold text-white/85 hover:border-emerald-500/35 hover:bg-white/[0.04]"
    >
      {children}
    </Link>
  );
}
