'use client';

import { Suspense, useEffect, useState } from 'react';
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
  User,
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
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={cn(
            'text-xl transition',
            n <= value ? 'text-amber-300' : 'text-white/20 hover:text-amber-200/70',
          )}
        >
          ★
        </button>
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
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-[12px] border border-white/[0.14] py-2.5 text-sm text-white/85 hover:bg-white/[0.05]"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving || !allFilled}
            className="flex-1 rounded-[12px] bg-gradient-to-r from-emerald-600 to-teal-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-900/30 disabled:opacity-45"
          >
            Сохранить
          </button>
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
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-[12px] border border-white/[0.14] py-2.5 text-sm"
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="flex-1 rounded-[12px] border border-red-500/35 bg-red-500/25 py-2.5 text-sm font-semibold text-red-50 disabled:opacity-50"
          >
            Отметить
          </button>
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

function ShiftCardCabinet(props: {
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

  return (
    <div className="rounded-[18px] border border-white/[0.08] bg-white/[0.04] p-5 shadow-inner shadow-black/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-4">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/30">
            {worker?.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={worker.photoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-white/40">
                <User className="h-7 w-7" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">{workerName}</p>
            <p className="mt-1 truncate text-sm text-white/55">
              {vacancy?.title ?? 'Смена'}{' '}
              {vacancy?.id ? (
                <Link href={`/employer/vacancies/${vacancy.id}`} className="text-emerald-300 underline-offset-4 hover:text-emerald-100 hover:underline">
                  Открыть
                </Link>
              ) : null}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/48">
              {whenRu ? (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" aria-hidden /> {whenRu}
                </span>
              ) : null}
              {worker?.ratingScore != null && (
                <span>
                  ★ {Number(worker.ratingScore).toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide',
            st.cls,
          )}
        >
          {st.label}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-white/52">
        {hasPaid ? (
          <span className="inline-flex items-center gap-1 text-emerald-200">
            <CheckCircle className="h-4 w-4" /> Оплачено ✓
          </span>
        ) : null}
        {payment?.status === 'PROCESSING' ? (
          <span className="inline-flex items-center gap-1 text-amber-100">
            <Clock className="h-4 w-4" /> Оплата в процессе
          </span>
        ) : null}
      </div>

      {shift.status === 'DISPUTED' ? (
        <div className="mt-4 flex gap-3 rounded-[12px] border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-xs text-amber-50">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            Спорная ситуация. Свяжитесь с поддержкой — мы поможем урегулировать конфликт.
            <button
              type="button"
              className="ml-3 font-semibold text-white underline underline-offset-2 hover:text-emerald-200"
              onClick={() => window.open('mailto:support@unity.ru', '_blank')}
            >
              Связаться с поддержкой
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {workerUid ? (
          <OpenChatButton
            recipientUserId={workerUid}
            context={{ type: 'SHIFT', id: shift.id }}
            label="Чат"
            className="inline-flex items-center gap-1 rounded-[11px] border border-white/[0.12] bg-white/[0.05] px-3 py-2 text-[12px] font-semibold text-white/90 hover:bg-white/[0.08] disabled:opacity-45"
          />
        ) : null}

        {shift.status === 'PENDING' ? (
          <button
            type="button"
            disabled={cancellingId === shift.id}
            onClick={() => onCancel(shift.id)}
            className="inline-flex items-center gap-1 rounded-[11px] border border-white/[0.12] px-3 py-2 text-[12px] font-semibold text-white/80 hover:bg-white/[0.05] disabled:opacity-45"
          >
            <XCircle className="h-3.5 w-3.5" />
            Отменить
          </button>
        ) : null}

        {shift.status === 'ACTIVE' ? (
          <button
            type="button"
            onClick={() => onFail(shift.id)}
            className="inline-flex items-center gap-1 rounded-[11px] border border-red-500/35 px-3 py-2 text-[12px] font-semibold text-red-200 hover:bg-red-500/15"
          >
            Провал работника…
          </button>
        ) : null}

        {canEmployerConfirm ? (
          <button
            type="button"
            disabled={confirmingId === shift.id}
            onClick={() => onConfirm(shift.id)}
            className={cn(
              'inline-flex items-center gap-1 rounded-[11px] px-3 py-2 text-[12px] font-semibold shadow-md shadow-emerald-900/35 disabled:opacity-45',
              awaitingBoth
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white'
                : 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white',
            )}
          >
            Подтвердить завершение
          </button>
        ) : null}

        {needsPay ? (
          <button
            type="button"
            disabled={payingId === shift.id}
            onClick={() => onPay(shift.id)}
            className="inline-flex items-center gap-1 rounded-[11px] bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-3 py-2 text-[12px] font-semibold text-white shadow-lg shadow-teal-900/40 disabled:opacity-45"
          >
            <CreditCard className="h-3.5 w-3.5" /> Оплатить
          </button>
        ) : null}

        {canReview ? (
          <button
            type="button"
            onClick={() => onReview(shift)}
            className="inline-flex items-center gap-1 rounded-[11px] border border-amber-400/35 bg-amber-500/10 px-3 py-2 text-[12px] font-semibold text-amber-50 hover:bg-amber-500/20"
          >
            <Star className="h-3.5 w-3.5" /> Оценить
          </button>
        ) : null}
      </div>

      {shift.status === 'ACTIVE' && shift.employerConfirmed && (
        <p className="mt-3 text-[11px] text-white/40">Вы подтвердили завершение, ожидаем вторую сторону.</p>
      )}
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

  async function fetchShifts() {
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
  }

  useEffect(() => {
    void fetchShifts();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch when URL-driven filters change
  }, [
    filters.tab,
    filters.page,
    filters.perPage,
    filters.vacancyId,
    filters.workerSearch,
    filters.dateFrom,
    filters.dateTo,
  ]);

  const handleConfirm = async (shiftId: string) => {
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
  };

  const handlePay = async (shiftId: string) => {
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
  };

  const handleCancel = async (shiftId: string) => {
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
  };

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
              <button
                key={k}
                type="button"
                onClick={() =>
                  setFilters({
                    tab: k,
                    page: 1,
                  })
                }
                className={cn(
                  'relative flex items-center whitespace-nowrap rounded-t-[11px] px-3 py-2 text-[13px] font-semibold transition sm:px-4 sm:py-2.5',
                  active ? 'bg-white/[0.1] text-white' : 'text-white/50 hover:bg-white/[0.04]',
                )}
              >
                {label}
                {n !== undefined && counts !== null ? (
                  <span className="ml-2 inline-flex min-h-[22px] min-w-[22px] items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[11px] font-bold text-black">
                    {n > 99 ? '99+' : n}
                  </span>
                ) : null}
              </button>
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
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-[210px] animate-pulse rounded-[18px] border border-white/[0.06] bg-white/[0.04]"
              />
            ))}
          </div>
        ) : shifts.length === 0 ? (
          <div className="flex flex-col items-center gap-5 rounded-[18px] border border-dashed border-white/[0.12] px-8 py-20 text-center">
            <Briefcase className="h-14 w-14 text-white/25" aria-hidden />
            <p className="max-w-sm text-sm text-white/60">{emptyRu(tab)}</p>
          </div>
        ) : (
          shifts.map((s) => (
            <ShiftCardCabinet
              key={s.id}
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
          ))
        )}
      </div>

      {pageMeta.totalPages > 1 ? (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-sm text-white/62">
          <span className="min-w-0">
            Стр. {filters.page ?? 1} / {pageMeta.totalPages} · {total} всего
          </span>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              disabled={(filters.page ?? 1) <= 1}
              onClick={() => setFilters({ page: Math.max(1, (filters.page ?? 1) - 1) })}
              className="inline-flex items-center gap-1 rounded-[12px] border border-white/[0.14] px-4 py-2 text-white/85 hover:bg-white/[0.06] disabled:opacity-35"
            >
              <ChevronLeft className="h-4 w-4" /> Назад
            </button>
            <button
              type="button"
              disabled={(filters.page ?? 1) >= pageMeta.totalPages}
              onClick={() =>
                setFilters({
                  page: Math.min(pageMeta.totalPages, (filters.page ?? 1) + 1),
                })
              }
              className="inline-flex items-center gap-1 rounded-[12px] border border-white/[0.14] px-4 py-2 text-white/85 hover:bg-white/[0.06] disabled:opacity-35"
            >
              Далее <ChevronRight className="h-4 w-4" />
            </button>
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