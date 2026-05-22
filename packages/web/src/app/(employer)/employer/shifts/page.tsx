'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Star,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { cn } from '@/lib/utils';
import { OpenChatButton } from '@/components/chat/OpenChatButton';
import { formatDateTimeRu } from '@/lib/dates/formatDateTime';
import { employerShiftsFiltersSchema } from '@/lib/filters/schemas';
import type { EmployerShiftsFilters } from '@/lib/filters/schemas';
import { useFilters } from '@/lib/filters/useFilters';
import { ResponsiveTable, type Column } from '@/components/ui/ResponsiveTable';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Button } from '@/components/ui/button';

type ShiftTab =
  | 'active'
  | 'pending_confirm'
  | 'completed'
  | 'needs_payment'
  | 'archive'
  | 'disputed'
  | 'all';

interface ShiftWorker {
  id: string;
  userId?: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  ratingScore?: unknown;
}

interface ShiftBooking {
  date?: string;
  timeStart?: string | null;
  timeEnd?: string | null;
  linkedVacancy?: { id: string; title: string; dateStart?: string } | null;
  worker?: ShiftWorker | null;
}

interface ShiftPayment {
  id: string;
  status: string;
  amount: number;
}

interface ShiftReview {
  id: string;
  reviewerId: string;
}

interface Shift {
  id: string;
  status: string;
  workerConfirmed: boolean;
  employerConfirmed: boolean;
  completedAt?: string | null;
  booking: ShiftBooking;
  reviews: ShiftReview[];
  payments: ShiftPayment[];
}

interface TabCounts {
  active: number;
  pending_confirm: number;
  completed: number;
  needs_payment: number;
  archive: number;
  disputed: number;
}

const TABS: { key: ShiftTab; label: string }[] = [
  { key: 'active', label: 'Активные' },
  { key: 'pending_confirm', label: 'Подтверждение' },
  { key: 'completed', label: 'Завершённые' },
  { key: 'needs_payment', label: 'Оплата' },
  { key: 'archive', label: 'Архив' },
  { key: 'disputed', label: 'Споры' },
];

const EMPLOYER_FAIL_CODES = [
  'NO_SHOW',
  'LEFT_EARLY',
  'POOR_QUALITY',
  'INTOXICATED',
  'MISCONDUCT',
] as const;

const EMPLOYER_FAIL_LABELS: Record<(typeof EMPLOYER_FAIL_CODES)[number], string> = {
  NO_SHOW: 'Не вышел',
  LEFT_EARLY: 'Ушёл раньше',
  POOR_QUALITY: 'Низкое качество',
  INTOXICATED: 'Состояние опьянения',
  MISCONDUCT: 'Некорректное поведение',
};

interface ReviewScores {
  punctuality: number;
  jobMatch: number;
  communication: number;
  workQuality: number;
  termsCompliance: number;
}

const REVIEW_CRITERIA: { key: keyof ReviewScores; label: string }[] = [
  { key: 'punctuality', label: 'Пунктуальность' },
  { key: 'jobMatch', label: 'Соответствие требованиям' },
  { key: 'communication', label: 'Коммуникация' },
  { key: 'workQuality', label: 'Качество работы' },
  { key: 'termsCompliance', label: 'Соблюдение договорённостей' },
];

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <Button
          key={n}
          type="button"
          variant="ghostInverse"
          onClick={() => onChange(n)}
          className={cn(
            'h-9 w-9 min-h-0 border-0 p-0 text-xl font-normal shadow-none',
            n <= value ? 'text-amber-300' : 'text-white/20 hover:text-amber-200/70',
          )}
        >
          ★
        </Button>
      ))}
    </div>
  );
}

function ReviewModal({
  shiftId,
  workerName,
  onClose,
  onSaved,
}: {
  shiftId: string;
  workerName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [scores, setScores] = useState<ReviewScores>({
    punctuality: 0,
    jobMatch: 0,
    communication: 0,
    workQuality: 0,
    termsCompliance: 0,
  });
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const allFilled = Object.values(scores).every((v) => v > 0);

  const handleSubmit = async () => {
    if (!allFilled) {
      toast('Оцените все 5 критериев', 'error');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post(`/shifts/${shiftId}/review`, { ...scores, comment: comment || undefined });
      toast('Оценка сохранена', 'success');
      onSaved();
    } catch {
      toast('Ошибка сохранения оценки', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-[18px] border border-white/[0.1] bg-[#101f18] p-6 text-white shadow-2xl">
        <h3 className="text-lg font-semibold">Оценить работника</h3>
        <p className="mt-1 text-sm text-white/55">{workerName}</p>
        <div className="mt-5 space-y-4">
          {REVIEW_CRITERIA.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <span className="text-sm text-white/80">{label}</span>
              <StarRating value={scores[key]} onChange={(v) => setScores((s) => ({ ...s, [key]: v }))} />
            </div>
          ))}
          <div>
            <label className="mb-2 block text-xs font-medium text-white/50">Комментарий</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={4000}
              placeholder="Необязательно"
              className="w-full rounded-[12px] border border-white/[0.1] bg-white/[0.05] px-3 py-2 text-sm outline-none placeholder:text-white/30 focus:border-emerald-500/50"
            />
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <Button type="button" variant="muted" onClick={onClose} className="flex-1 rounded-[12px]">
            Отмена
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => void handleSubmit()}
            disabled={saving || !allFilled}
            isLoading={saving}
            className="flex-1 rounded-[12px]"
          >
            Сохранить
          </Button>
        </div>
      </div>
    </div>
  );
}

function FailModal({
  shiftId,
  onClose,
  onDone,
}: {
  shiftId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [reason, setReason] = useState<(typeof EMPLOYER_FAIL_CODES)[number]>('NO_SHOW');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await apiClient.patch(`/employer/shifts/${shiftId}/fail`, {
        reason,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      toast('Смена отмечена как провальная', 'success');
      onDone();
      onClose();
    } catch {
      toast('Не удалось сохранить', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-[18px] border border-white/[0.1] bg-[#101f18] p-6 text-white">
        <h3 className="text-lg font-semibold">Неуспешная смена</h3>
        <p className="mt-2 text-sm text-white/55">Причина (по работнику)</p>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value as (typeof EMPLOYER_FAIL_CODES)[number])}
          className="mt-3 w-full rounded-[12px] border border-white/[0.1] bg-white/[0.05] px-3 py-2 text-sm outline-none"
        >
          {EMPLOYER_FAIL_CODES.map((c) => (
            <option key={c} value={c} className="text-gray-900">
              {EMPLOYER_FAIL_LABELS[c]}
            </option>
          ))}
        </select>
        <label className="mt-4 block">
          <span className="text-xs text-white/50">Заметка</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-[12px] border border-white/[0.1] bg-white/[0.05] px-3 py-2 text-sm outline-none"
          />
        </label>
        <div className="mt-6 flex gap-3">
          <Button type="button" variant="muted" onClick={onClose} className="flex-1 rounded-[12px]">
            Отмена
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={busy}
            isLoading={busy}
            onClick={() => void submit()}
            className="flex-1 rounded-[12px]"
          >
            Отметить
          </Button>
        </div>
      </div>
    </div>
  );
}

const STATUS_VISUAL: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Ожидает', cls: 'bg-white/[0.08] text-white/75 ring-1 ring-white/[0.12]' },
  ACTIVE: { label: 'Активна', cls: 'bg-sky-500/15 text-sky-100 ring-1 ring-sky-400/35' },
  COMPLETED: { label: 'Завершена', cls: 'bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-400/35' },
  FAILED: { label: 'Провал', cls: 'bg-red-500/15 text-red-100 ring-1 ring-red-400/35' },
  CANCELLED: { label: 'Отменена', cls: 'bg-white/[0.06] text-white/55 ring-1 ring-white/[0.1]' },
  DISPUTED: { label: 'Спор', cls: 'bg-amber-500/15 text-amber-50 ring-1 ring-amber-400/40' },
};

function getShiftPresentation(shift: Shift, currentUserId: string) {
  const worker = shift.booking.worker;
  const workerName = worker ? `${worker.firstName} ${worker.lastName}`.trim() || 'Работник' : 'Работник';
  const vacancy = shift.booking.linkedVacancy;
  const payment = shift.payments?.[0];
  const hasPaid = shift.payments.some((p) => p.status === 'COMPLETED');
  const alreadyReviewed = shift.reviews.some((r) => r.reviewerId === currentUserId);
  const st = STATUS_VISUAL[shift.status] ?? {
    label: shift.status,
    cls: 'bg-white/[0.06] text-white/70 ring-1 ring-white/[0.1]',
  };
  let whenRu: string | null = null;
  if (shift.booking.date) {
    const base = `${shift.booking.date}${shift.booking.timeStart ? `T${shift.booking.timeStart}` : ''}`;
    const d = new Date(base.includes('T') ? base : `${shift.booking.date}T12:00:00`);
    if (!Number.isNaN(d.getTime())) whenRu = formatDateTimeRu(d.toISOString(), 'datetime');
  } else if (vacancy?.dateStart) {
    whenRu = formatDateTimeRu(vacancy.dateStart, 'datetime');
  }
  const canEmployerConfirm =
    ['ACTIVE', 'PENDING', 'DISPUTED'].includes(shift.status) && !shift.employerConfirmed;
  const awaitingBoth =
    shift.status === 'ACTIVE' && shift.workerConfirmed && !shift.employerConfirmed;
  const needsPay =
    shift.status === 'COMPLETED' && !hasPaid && payment?.status !== 'PROCESSING';
  const canReview = shift.status === 'COMPLETED' && !alreadyReviewed && hasPaid;
  const workerUid = worker?.userId;
  return {
    worker,
    workerName,
    vacancy,
    payment,
    hasPaid,
    alreadyReviewed,
    st,
    whenRu,
    canEmployerConfirm,
    awaitingBoth,
    needsPay,
    canReview,
    workerUid,
  };
}

function ShiftRowActionsBar(props: {
  shift: Shift;
  currentUserId: string;
  onConfirm: (id: string) => void;
  onReview: (s: Shift) => void;
  onPay: (id: string) => void;
  onCancel: (id: string) => void;
  onFail: (id: string) => void;
  confirmingId: string | null;
  payingId: string | null;
  cancellingId: string | null;
}) {
  const {
    shift,
    currentUserId,
    onConfirm,
    onReview,
    onPay,
    onCancel,
    onFail,
    confirmingId,
    payingId,
    cancellingId,
  } = props;
  const { workerUid, canEmployerConfirm, awaitingBoth, needsPay, canReview } = getShiftPresentation(
    shift,
    currentUserId,
  );
  return (
    <div className="flex flex-wrap gap-2">
      {workerUid ? (
        <OpenChatButton
          recipientUserId={workerUid}
          context={{ type: 'SHIFT', id: shift.id }}
          label="Чат"
          className="inline-flex items-center gap-1 rounded-[11px] border border-white/[0.12] bg-white/[0.05] px-3 py-2 text-[12px] font-semibold text-white/90 hover:bg-white/[0.08] disabled:opacity-45"
        />
      ) : null}
      {shift.status === 'PENDING' ? (
        <Button
          type="button"
          variant="muted"
          size="sm"
          disabled={cancellingId === shift.id}
          onClick={() => onCancel(shift.id)}
          leftIcon={<XCircle className="h-3.5 w-3.5" />}
          className="rounded-[11px] px-3 py-2 text-[12px]"
        >
          Отменить
        </Button>
      ) : null}
      {shift.status === 'ACTIVE' ? (
        <Button
          type="button"
          variant="ghostInverse"
          size="sm"
          onClick={() => onFail(shift.id)}
          className="rounded-[11px] border border-red-500/35 px-3 py-2 text-[12px] text-red-200 hover:bg-red-500/15"
        >
          Провал работника…
        </Button>
      ) : null}
      {canEmployerConfirm ? (
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={confirmingId === shift.id}
          onClick={() => onConfirm(shift.id)}
          isLoading={confirmingId === shift.id}
          className={cn(
            'rounded-[11px] px-3 py-2 text-[12px] shadow-md shadow-emerald-900/35',
            awaitingBoth
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:brightness-105'
              : '',
          )}
        >
          Подтвердить
        </Button>
      ) : null}
      {needsPay ? (
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={payingId === shift.id}
          isLoading={payingId === shift.id}
          onClick={() => onPay(shift.id)}
          leftIcon={<CreditCard className="h-3.5 w-3.5" />}
          className="rounded-[11px] bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-3 py-2 text-[12px] shadow-lg shadow-teal-900/40"
        >
          Оплатить
        </Button>
      ) : null}
      {canReview ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onReview(shift)}
          leftIcon={<Star className="h-3.5 w-3.5" />}
          className="rounded-[11px] border-amber-400/35 bg-amber-500/10 text-amber-50 hover:bg-amber-500/20"
        >
          Оценить
        </Button>
      ) : null}
    </div>
  );
}

const SHIFT_FILTER_DEFAULTS: Partial<EmployerShiftsFilters> = {
  tab: 'active',
  page: 1,
  perPage: 15,
};

function emptyRu(t: ShiftTab): string {
  const map: Record<ShiftTab, string> = {
    active: 'Нет активных смен.',
    pending_confirm: 'Нет смен, ожидающих вашего подтверждения.',
    completed: 'Ещё нет завершённых и оплаченных смен.',
    needs_payment: 'Нет смен без оплаты.',
    archive: 'Архив пуст.',
    disputed: 'Спорных смен нет.',
    all: 'Смен по текущим фильтрам не найдено.',
  };
  return map[t];
}

interface VacOpt {
  id: string;
  title: string;
}

function EmployerShiftsInner() {
  const { toast } = useToast();
  const { filters, setFilters } = useFilters(employerShiftsFiltersSchema, SHIFT_FILTER_DEFAULTS);
  const tab = (filters.tab ?? 'active') as ShiftTab;

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [counts, setCounts] = useState<TabCounts | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pageMeta, setPageMeta] = useState({ totalPages: 1, perPage: 15 });

  const [vacancies, setVacancies] = useState<VacOpt[]>([]);
  const [workerDraft, setWorkerDraft] = useState(filters.workerSearch ?? '');

  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [failShiftId, setFailShiftId] = useState<string | null>(null);
  const [reviewShift, setReviewShift] = useState<Shift | null>(null);
  const [currentUserId, setCurrentUserId] = useState('');

  useEffect(() => {
    apiClient
      .get<{ data: { user: { id: string } } }>('/auth/me')
      .then((r) => setCurrentUserId(r.data?.user?.id ?? ''))
      .catch(() => {});
  }, []);

  useEffect(() => {
    void apiClient
      .get<{ data: VacOpt[] }>('/employer/vacancies', {
        tab: 'live',
        vacancyStatus: 'all',
        sort: 'newest',
        page: 1,
        perPage: 80,
      })
      .then((r) => setVacancies(Array.isArray(r.data) ? r.data : []))
      .catch(() => setVacancies([]));
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const next = workerDraft.trim() || undefined;
      if (next !== filters.workerSearch) setFilters({ workerSearch: next, page: 1 });
    }, 380);
    return () => window.clearTimeout(t);
  }, [workerDraft, filters.workerSearch, setFilters]);

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{
        success?: boolean;
        data: Shift[];
        meta: {
          total: number;
          page: number;
          perPage: number;
          totalPages: number;
          tabCounts: TabCounts;
        };
      }>('/employer/shifts', {
        tab: filters.tab ?? 'active',
        page: filters.page ?? 1,
        perPage: filters.perPage ?? 15,
        ...(filters.vacancyId ? { vacancyId: filters.vacancyId } : {}),
        ...(filters.workerSearch?.trim() ? { workerSearch: filters.workerSearch.trim() } : {}),
        ...(filters.dateFrom?.trim() ? { dateFrom: filters.dateFrom } : {}),
        ...(filters.dateTo?.trim() ? { dateTo: filters.dateTo } : {}),
      });
      setShifts(Array.isArray(res.data) ? res.data : []);
      setTotal(res.meta?.total ?? 0);
      setCounts(res.meta?.tabCounts ?? null);
      setPageMeta({
        totalPages: res.meta?.totalPages ?? 1,
        perPage: res.meta?.perPage ?? 15,
      });
    } catch {
      toast('Ошибка загрузки смен', 'error');
    } finally {
      setLoading(false);
    }
  }, [
    filters.tab,
    filters.page,
    filters.perPage,
    filters.vacancyId,
    filters.workerSearch,
    filters.dateFrom,
    filters.dateTo,
    toast,
  ]);

  useEffect(() => {
    void fetchShifts();
  }, [fetchShifts]);

  const handleConfirm = useCallback(
    async (shiftId: string) => {
      setConfirmingId(shiftId);
      try {
        const res = await apiClient.patch<{ data: Shift }>(`/employer/shifts/${shiftId}/confirm`);
        setShifts((prev) =>
          prev.map((s) => (s.id === shiftId ? { ...s, ...res.data } : s)),
        );
        toast(
          res.data.workerConfirmed && res.data.employerConfirmed
            ? 'Смена завершена. Можно оплатить.'
            : 'Подтверждено вашей стороной.',
          'success',
        );
        await fetchShifts();
      } catch {
        toast('Подтвердить завершение не удалось', 'error');
      } finally {
        setConfirmingId(null);
      }
    },
    [fetchShifts, toast],
  );

  const handlePay = useCallback(async (shiftId: string) => {
    setPayingId(shiftId);
    try {
      const res = await apiClient.post<{ data: { paymentUrl: string } }>('/payments/create', {
        shiftId,
      });
      window.location.href = res.data.paymentUrl;
    } catch {
      toast('Не удалось создать платёж', 'error');
      setPayingId(null);
    }
  }, [toast]);

  const handleCancel = useCallback(
    async (shiftId: string) => {
      setCancellingId(shiftId);
      try {
        await apiClient.patch(`/employer/shifts/${shiftId}/cancel`);
        toast('Смена отменена', 'success');
        await fetchShifts();
      } catch {
        toast('Отменить смену не удалось', 'error');
      } finally {
        setCancellingId(null);
      }
    },
    [fetchShifts, toast],
  );

  const shiftColumns = useMemo((): Column<Shift>[] => {
    const cid = currentUserId;
    return [
      {
        key: 'worker',
        header: 'Работник',
        render: (shift) => {
          const { worker, workerName } = getShiftPresentation(shift, cid);
          return (
            <div className="flex items-center gap-3">
              <UserAvatar src={worker?.photoUrl ?? null} name={workerName} size={48} />
              <div className="min-w-0">
                <div className="truncate font-medium text-[rgba(255,255,255,0.92)]">{workerName}</div>
                {worker?.ratingScore != null ? (
                  <div className="text-xs text-white/45">★ {Number(worker.ratingScore).toFixed(1)}</div>
                ) : null}
              </div>
            </div>
          );
        },
      },
      {
        key: 'vacancy',
        header: 'Вакансия · дата',
        render: (shift) => {
          const { vacancy, whenRu } = getShiftPresentation(shift, cid);
          return (
            <div className="max-w-[min(100%,300px)]">
              <div className="text-[rgba(255,255,255,0.9)]">
                {vacancy?.title ?? 'Смена'}{' '}
                {vacancy?.id ? (
                  <Link
                    href={`/employer/vacancies/${vacancy.id}`}
                    className="text-emerald-300 underline-offset-4 hover:text-emerald-100 hover:underline"
                  >
                    Открыть
                  </Link>
                ) : null}
              </div>
              {whenRu ? (
                <div className="mt-1 inline-flex items-center gap-1 text-xs text-white/48">
                  <Calendar className="h-3.5 w-3.5" aria-hidden /> {whenRu}
                </div>
              ) : null}
              {shift.status === 'DISPUTED' ? (
                <div className="mt-2 flex flex-wrap items-start gap-2 rounded-lg border border-amber-400/35 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-50">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>Спор — свяжитесь с поддержкой</span>
                  <Button
                    type="button"
                    variant="link"
                    className="inline h-auto min-h-0 p-0 font-semibold text-white underline shadow-none"
                    onClick={() => window.open('mailto:support@unity.ru', '_blank')}
                  >
                    support@unity.ru
                  </Button>
                </div>
              ) : null}
              {shift.status === 'ACTIVE' && shift.employerConfirmed ? (
                <p className="mt-2 text-[11px] text-white/40">Ожидаем подтверждение второй стороны.</p>
              ) : null}
            </div>
          );
        },
      },
      {
        key: 'status',
        header: 'Статус',
        render: (shift) => {
          const { st } = getShiftPresentation(shift, cid);
          return (
            <span
              className={cn(
                'inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide',
                st.cls,
              )}
            >
              {st.label}
            </span>
          );
        },
      },
      {
        key: 'pay',
        header: 'Оплата',
        render: (shift) => {
          const { payment, hasPaid } = getShiftPresentation(shift, cid);
          const amount = payment?.amount ?? shift.payments[0]?.amount;
          if (hasPaid) {
            return (
              <span className="inline-flex items-center gap-1 text-sm text-emerald-200">
                <CheckCircle className="h-4 w-4" /> Оплачено
              </span>
            );
          }
          if (payment?.status === 'PROCESSING') {
            return (
              <span className="inline-flex items-center gap-1 text-sm text-amber-100">
                <Clock className="h-4 w-4" /> В процессе
              </span>
            );
          }
          if (amount != null && amount > 0) {
            return (
              <span className="text-sm text-white/75">{Number(amount).toLocaleString('ru-RU')} ₽</span>
            );
          }
          return <span className="text-white/50">—</span>;
        },
      },
      {
        key: 'actions',
        header: 'Действия',
        render: (shift) => (
          <ShiftRowActionsBar
            shift={shift}
            currentUserId={cid}
            onConfirm={handleConfirm}
            onReview={setReviewShift}
            onPay={handlePay}
            onCancel={handleCancel}
            onFail={(id) => setFailShiftId(id)}
            confirmingId={confirmingId}
            payingId={payingId}
            cancellingId={cancellingId}
          />
        ),
      },
    ];
  }, [currentUserId, confirmingId, payingId, cancellingId, handleConfirm, handlePay, handleCancel]);

  const shiftMobileCard = useMemo(
    () => ({
      title: (s: Shift) => {
        const { workerName } = getShiftPresentation(s, currentUserId);
        return <span className="font-medium">{workerName}</span>;
      },
      subtitle: (s: Shift) => {
        const { vacancy, whenRu } = getShiftPresentation(s, currentUserId);
        return (
          <span>
            {vacancy?.title ?? 'Смена'}
            {whenRu ? ` · ${whenRu}` : ''}
          </span>
        );
      },
      badge: (s: Shift) => {
        const { st } = getShiftPresentation(s, currentUserId);
        return (
          <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase', st.cls)}>
            {st.label}
          </span>
        );
      },
      meta: (s: Shift) => {
        const { payment, hasPaid } = getShiftPresentation(s, currentUserId);
        const amount = payment?.amount ?? s.payments[0]?.amount;
        const parts: string[] = [];
        if (hasPaid) parts.push('Оплачено');
        else if (payment?.status === 'PROCESSING') parts.push('Оплата в процессе');
        else if (amount != null && amount > 0) parts.push(`${Number(amount).toLocaleString('ru-RU')} ₽`);
        return <span>{parts.join(' · ') || '—'}</span>;
      },
      actions: (s: Shift) => (
        <ShiftRowActionsBar
          shift={s}
          currentUserId={currentUserId}
          onConfirm={handleConfirm}
          onReview={setReviewShift}
          onPay={handlePay}
          onCancel={handleCancel}
          onFail={(id) => setFailShiftId(id)}
          confirmingId={confirmingId}
          payingId={payingId}
          cancellingId={cancellingId}
        />
      ),
    }),
    [currentUserId, confirmingId, payingId, cancellingId, handleConfirm, handlePay, handleCancel],
  );

  return (
    <div className="min-w-0">
      <h1 className="text-2xl font-bold tracking-tight text-white md:text-[28px]">Смены</h1>
      <p className="mt-2 max-w-xl text-sm text-white/58">
        Подтверждение выполнения, оплата и архив ваших заказов.
      </p>

      <div className="mt-6 overflow-x-auto border-b border-white/[0.08] pb-0">
        <div className="flex min-w-max flex-wrap gap-1 sm:flex-nowrap sm:gap-2">
          {TABS.map(({ key: k, label }) => {
            const active = tab === k;
            const n =
              k === 'completed'
                ? counts?.completed
                : k === 'needs_payment'
                  ? counts?.needs_payment
                  : k === 'pending_confirm'
                    ? counts?.pending_confirm
                    : k === 'archive'
                      ? counts?.archive
                      : k === 'disputed'
                        ? counts?.disputed
                        : counts?.active;
            return (
              <Button
                key={k}
                type="button"
                variant="ghostInverse"
                size="sm"
                onClick={() =>
                  setFilters({
                    tab: k,
                    page: 1,
                  })
                }
                className={cn(
                  'relative inline-flex items-center whitespace-nowrap rounded-t-[11px] px-3 py-2 text-[13px] font-semibold shadow-none sm:px-4 sm:py-2.5',
                  active ? 'bg-white/[0.1] text-white' : 'text-white/50 hover:bg-white/[0.04]',
                )}
              >
                {label}
                {n !== undefined && counts !== null ? (
                  <span className="ml-2 inline-flex min-h-[22px] min-w-[22px] items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[11px] font-bold text-black">
                    {n > 99 ? '99+' : n}
                  </span>
                ) : null}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 rounded-[18px] border border-white/[0.08] bg-white/[0.03] p-4 sm:p-5">
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex min-w-0 flex-col text-xs font-medium text-white/52">
            Вакансия
            <select
              value={filters.vacancyId ?? ''}
              onChange={(e) => setFilters({ vacancyId: e.target.value || undefined, page: 1 })}
              className="mt-1.5 min-w-0 rounded-[12px] border border-white/[0.1] bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50"
            >
              <option value="">Все</option>
              {vacancies.map((v) => (
                <option key={v.id} value={v.id} className="text-gray-900">
                  {v.title}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col text-xs font-medium text-white/52 lg:col-span-2">
            Работник
            <input
              value={workerDraft}
              onChange={(e) => setWorkerDraft(e.target.value)}
              placeholder="Имя"
              className="mt-1.5 rounded-[12px] border border-white/[0.1] bg-white/[0.05] px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-emerald-500/50"
            />
          </label>
          <label className="flex min-w-0 flex-col text-xs font-medium text-white/52">
            С даты
            <input
              type="date"
              value={filters.dateFrom ?? ''}
              onChange={(e) => setFilters({ dateFrom: e.target.value || undefined, page: 1 })}
              className="mt-1.5 rounded-[12px] border border-white/[0.1] bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50"
            />
          </label>
          <label className="flex min-w-0 flex-col text-xs font-medium text-white/52">
            По дату
            <input
              type="date"
              value={filters.dateTo ?? ''}
              onChange={(e) => setFilters({ dateTo: e.target.value || undefined, page: 1 })}
              className="mt-1.5 rounded-[12px] border border-white/[0.1] bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50"
            />
          </label>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <ResponsiveTable
          data={shifts}
          columns={shiftColumns}
          mobileCard={shiftMobileCard}
          keyExtractor={(s) => s.id}
          isLoading={loading}
          variant="dark"
          skeletonRows={5}
          emptyState={
            <div className="flex flex-col items-center gap-5 rounded-[18px] border border-dashed border-white/[0.12] px-8 py-20 text-center">
              <Briefcase className="h-14 w-14 text-white/25" aria-hidden />
              <p className="max-w-sm text-sm text-white/60">{emptyRu(tab)}</p>
            </div>
          }
        />
      </div>

      {pageMeta.totalPages > 1 ? (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-sm text-white/62">
          <span className="min-w-0">
            Стр. {filters.page ?? 1} / {pageMeta.totalPages} · {total} всего
          </span>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="muted"
              size="sm"
              disabled={(filters.page ?? 1) <= 1}
              onClick={() => setFilters({ page: Math.max(1, (filters.page ?? 1) - 1) })}
              leftIcon={<ChevronLeft className="h-4 w-4" aria-hidden />}
            >
              Назад
            </Button>
            <Button
              type="button"
              variant="muted"
              size="sm"
              disabled={(filters.page ?? 1) >= pageMeta.totalPages}
              onClick={() =>
                setFilters({
                  page: Math.min(pageMeta.totalPages, (filters.page ?? 1) + 1),
                })
              }
              rightIcon={<ChevronRight className="h-4 w-4" aria-hidden />}
            >
              Далее
            </Button>
          </div>
        </div>
      ) : null}

      {failShiftId ? (
        <FailModal
          shiftId={failShiftId}
          onClose={() => setFailShiftId(null)}
          onDone={() => void fetchShifts()}
        />
      ) : reviewShift ? (
        <ReviewModal
          shiftId={reviewShift.id}
          workerName={`${reviewShift.booking.worker?.firstName ?? ''} ${reviewShift.booking.worker?.lastName ?? ''}`.trim()}
          onClose={() => setReviewShift(null)}
          onSaved={() => {
            setReviewShift(null);
            void fetchShifts();
          }}
        />
      ) : null}
    </div>
  );
}

export default function EmployerShiftsPage() {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse space-y-4">
          <div className="h-11 w-48 rounded-xl bg-white/[0.06]" />
          <div className="h-[210px] rounded-[18px] border border-white/[0.06] bg-white/[0.03]" />
        </div>
      }
    >
      <EmployerShiftsInner />
    </Suspense>
  );
}