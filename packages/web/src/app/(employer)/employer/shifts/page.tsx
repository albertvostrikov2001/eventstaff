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
  Edit2,
  MapPin,
  Star,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { useAuthStore } from '@/stores/authStore';
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
  id: string;
  date?: string;
  timeStart?: string | null;
  timeEnd?: string | null;
  location?: string | null;
  rate?: number | null;
  description?: string | null;
  linkedVacancy?: { id: string; title: string; dateStart?: string } | null;
  worker?: ShiftWorker | null;
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
}

interface TabCounts {
  active: number;
  pending_confirm: number;
  completed: number;
  archive: number;
  disputed: number;
}

const TABS: { key: ShiftTab; label: string }[] = [
  { key: 'active', label: 'Активные' },
  { key: 'pending_confirm', label: 'Завершить смены' },
  { key: 'completed', label: 'Завершённые' },
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

// ─── Reusable styles ──────────────────────────────────────────────────────────
const MODAL_INPUT =
  'w-full rounded-[12px] border border-white/[0.1] bg-white/[0.05] px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-emerald-500/50 disabled:opacity-50';
const MODAL_LABEL = 'mb-1.5 block text-xs font-medium text-white/55';

// ─── Star rating ──────────────────────────────────────────────────────────────
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

// ─── Edit Booking Modal ───────────────────────────────────────────────────────
function EditBookingModal({
  bookingId,
  initial,
  workerName,
  onClose,
  onSaved,
}: {
  bookingId: string;
  initial: ShiftBooking;
  workerName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [date, setDate] = useState(initial.date ? initial.date.slice(0, 10) : '');
  const [timeStart, setTimeStart] = useState(initial.timeStart ?? '');
  const [timeEnd, setTimeEnd] = useState(initial.timeEnd ?? '');
  const [location, setLocation] = useState(initial.location ?? '');
  const [rate, setRate] = useState(initial.rate != null ? String(initial.rate) : '');
  const [description, setDescription] = useState(initial.description ?? '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) { toast('Укажите дату смены', 'error'); return; }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        date: new Date(date).toISOString(),
      };
      if (timeStart) body.timeStart = timeStart;
      else body.timeStart = null;
      if (timeEnd) body.timeEnd = timeEnd;
      else body.timeEnd = null;
      if (location.trim()) body.location = location.trim();
      else body.location = null;
      if (rate && Number(rate) > 0) body.rate = Number(rate);
      if (description.trim()) body.description = description.trim();
      else body.description = null;

      await apiClient.patch(`/employer/bookings/${bookingId}`, body);
      toast('Детали смены обновлены', 'success');
      onSaved();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Не удалось сохранить изменения', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-[18px] border border-white/[0.1] bg-[#101f18] p-6 text-white shadow-2xl">
        <h3 className="text-lg font-semibold">Редактировать детали смены</h3>
        <p className="mt-1 text-sm text-white/55">Работник: {workerName}</p>
        <p className="mt-1 text-[12px] text-amber-300/80">
          Изменения видны работнику немедленно — он получит уведомление
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 space-y-4">
          {/* Date */}
          <div>
            <label className={MODAL_LABEL}>Дата смены</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={MODAL_INPUT}
              required
            />
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={MODAL_LABEL}>Начало</label>
              <input
                type="time"
                value={timeStart}
                onChange={(e) => setTimeStart(e.target.value)}
                className={MODAL_INPUT}
              />
            </div>
            <div>
              <label className={MODAL_LABEL}>Конец</label>
              <input
                type="time"
                value={timeEnd}
                onChange={(e) => setTimeEnd(e.target.value)}
                className={MODAL_INPUT}
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className={MODAL_LABEL}>
              <MapPin className="inline h-3.5 w-3.5 mr-1 opacity-60" />
              Место проведения
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Адрес или название"
              maxLength={500}
              className={MODAL_INPUT}
            />
          </div>

          {/* Rate */}
          <div>
            <label className={MODAL_LABEL}>Ставка (₽)</label>
            <input
              type="number"
              min={1}
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="Сумма за смену"
              className={MODAL_INPUT}
            />
          </div>

          {/* Description */}
          <div>
            <label className={MODAL_LABEL}>Описание / инструкции</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Необязательно — что нужно взять, куда прийти…"
              className={MODAL_INPUT}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="muted"
              onClick={onClose}
              className="flex-1 rounded-[12px]"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={saving}
              isLoading={saving}
              className="flex-1 rounded-[12px]"
            >
              Сохранить
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Review Modal ─────────────────────────────────────────────────────────────
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
    if (!allFilled) { toast('Оцените все 5 критериев', 'error'); return; }
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
            <label className={MODAL_LABEL}>Комментарий</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={4000}
              placeholder="Необязательно"
              className={MODAL_INPUT}
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

// ─── Fail Modal ───────────────────────────────────────────────────────────────
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
        <p className="mt-2 text-sm text-white/55">Укажите причину со стороны работника</p>
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
          <span className="text-xs text-white/50">Заметка (необязательно)</span>
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
            Отметить провал
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Status visuals ───────────────────────────────────────────────────────────
const STATUS_VISUAL: Record<string, { label: string; cls: string }> = {
  PENDING: {
    label: 'Ожидает ответа',
    cls: 'bg-amber-500/15 text-amber-100 ring-1 ring-amber-400/35',
  },
  ACTIVE: {
    label: 'В работе',
    cls: 'bg-sky-500/15 text-sky-100 ring-1 ring-sky-400/35',
  },
  COMPLETED: {
    label: 'Завершена',
    cls: 'bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-400/35',
  },
  FAILED: {
    label: 'Провал',
    cls: 'bg-red-500/15 text-red-100 ring-1 ring-red-400/35',
  },
  CANCELLED: {
    label: 'Отменена',
    cls: 'bg-white/[0.06] text-white/55 ring-1 ring-white/[0.1]',
  },
  DISPUTED: {
    label: 'Спор',
    cls: 'bg-amber-500/15 text-amber-50 ring-1 ring-amber-400/40',
  },
};

// ─── Shift presentation helper ────────────────────────────────────────────────
function getShiftPresentation(shift: Shift, currentUserId: string) {
  const worker = shift.booking.worker;
  const workerName = worker
    ? `${worker.firstName} ${worker.lastName}`.trim() || 'Работник'
    : 'Работник';
  const vacancy = shift.booking.linkedVacancy;
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

  // Employer can confirm completion only on ACTIVE or DISPUTED shifts
  const canEmployerConfirm =
    ['ACTIVE', 'DISPUTED'].includes(shift.status) && !shift.employerConfirmed;

  // Worker confirmed completion, waiting for employer
  const awaitingEmployer =
    shift.status === 'ACTIVE' && shift.workerConfirmed && !shift.employerConfirmed;

  // PENDING = shift assigned, waiting for worker to accept
  const isPendingWorkerAcceptance = shift.status === 'PENDING';

  const canReview = shift.status === 'COMPLETED' && !alreadyReviewed;
  const workerUid = worker?.userId;

  return {
    worker,
    workerName,
    vacancy,
    alreadyReviewed,
    st,
    whenRu,
    canEmployerConfirm,
    awaitingEmployer,
    isPendingWorkerAcceptance,
    canReview,
    workerUid,
  };
}

// ─── Action buttons bar ───────────────────────────────────────────────────────
function ShiftRowActionsBar(props: {
  shift: Shift;
  currentUserId: string;
  onConfirm: (id: string) => void;
  onReview: (s: Shift) => void;
  onCancel: (id: string) => void;
  onFail: (id: string) => void;
  onEdit: (s: Shift) => void;
  confirmingId: string | null;
  cancellingId: string | null;
}) {
  const {
    shift,
    currentUserId,
    onConfirm,
    onReview,
    onCancel,
    onFail,
    onEdit,
    confirmingId,
    cancellingId,
  } = props;
  const {
    workerUid,
    canEmployerConfirm,
    awaitingEmployer,
    isPendingWorkerAcceptance,
    canReview,
  } = getShiftPresentation(shift, currentUserId);

  return (
    <div className="flex flex-wrap gap-2">
      {/* Chat button (always available when there's a worker userId) */}
      {workerUid ? (
        <OpenChatButton
          recipientUserId={workerUid}
          context={{ type: 'SHIFT', id: shift.id }}
          label="Чат"
          className="inline-flex items-center gap-1 rounded-[11px] border border-white/[0.12] bg-white/[0.05] px-3 py-2 text-[12px] font-semibold text-white/90 hover:bg-white/[0.08] disabled:opacity-45"
        />
      ) : null}

      {/* PENDING: Edit + Cancel */}
      {isPendingWorkerAcceptance ? (
        <>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onEdit(shift)}
            leftIcon={<Edit2 className="h-3.5 w-3.5" />}
            className="rounded-[11px] border-amber-400/35 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-100 hover:bg-amber-500/20"
          >
            Редактировать
          </Button>
          <Button
            type="button"
            variant="muted"
            size="sm"
            disabled={cancellingId === shift.id}
            isLoading={cancellingId === shift.id}
            onClick={() => onCancel(shift.id)}
            leftIcon={<XCircle className="h-3.5 w-3.5" />}
            className="rounded-[11px] px-3 py-2 text-[12px]"
          >
            Отменить
          </Button>
        </>
      ) : null}

      {/* ACTIVE: Fail + Confirm completion */}
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
          leftIcon={<CheckCircle className="h-3.5 w-3.5" />}
          className={cn(
            'rounded-[11px] px-3 py-2 text-[12px] shadow-md shadow-emerald-900/35',
            awaitingEmployer
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-105'
              : '',
          )}
        >
          {awaitingEmployer ? 'Подтвердить завершение' : 'Подтвердить'}
        </Button>
      ) : null}

      {/* Review */}
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

// ─── Filter defaults ──────────────────────────────────────────────────────────
const SHIFT_FILTER_DEFAULTS: Partial<EmployerShiftsFilters> = {
  tab: 'active',
  page: 1,
  perPage: 15,
};

function emptyRu(t: ShiftTab): string {
  const map: Record<ShiftTab, string> = {
    active: 'Нет активных смен. Подтверждённые отклики автоматически создают смену.',
    pending_confirm: 'Нет смен, ожидающих вашего подтверждения завершения.',
    completed: 'Ещё нет завершённых смен.',
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

// ─── Main inner component ─────────────────────────────────────────────────────
function EmployerShiftsInner() {
  const { toast } = useToast();
  const currentUserId = useAuthStore((s) => s.user?.id ?? '');

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
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [failShiftId, setFailShiftId] = useState<string | null>(null);
  const [reviewShift, setReviewShift] = useState<Shift | null>(null);
  const [editShift, setEditShift] = useState<Shift | null>(null);

  // Load vacancies for filter dropdown
  useEffect(() => {
    void apiClient
      .get<{ data: VacOpt[] }>('/employer/vacancies', {
        tab: 'live',
        vacancyStatus: 'all',
        sort: 'newest',
        page: 1,
        perPage: 50,
      })
      .then((r) => setVacancies(Array.isArray(r.data) ? r.data : []))
      .catch(() => setVacancies([]));
  }, []);

  // Debounce worker search
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

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleConfirm = useCallback(
    async (shiftId: string) => {
      setConfirmingId(shiftId);
      try {
        const res = await apiClient.patch<{ data: Shift }>(`/employer/shifts/${shiftId}/confirm`);
        toast(
          res.data.workerConfirmed && res.data.employerConfirmed
            ? 'Смена завершена.'
            : 'Ваше подтверждение принято.',
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

  // ── Columns ────────────────────────────────────────────────────────────────
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
          const { vacancy, whenRu, isPendingWorkerAcceptance, awaitingEmployer } =
            getShiftPresentation(shift, cid);
          return (
            <div className="max-w-[min(100%,300px)]">
              <div className="text-[rgba(255,255,255,0.9)]">
                {vacancy?.title ?? (shift.booking.description ?? 'Смена')}{' '}
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
              {shift.booking.location ? (
                <div className="mt-1 inline-flex items-center gap-1 text-xs text-white/40">
                  <MapPin className="h-3 w-3" aria-hidden /> {shift.booking.location}
                </div>
              ) : null}
              {isPendingWorkerAcceptance ? (
                <p className="mt-2 text-[11px] text-amber-300/80">
                  Ожидаем ответ работника…
                </p>
              ) : null}
              {awaitingEmployer ? (
                <p className="mt-2 text-[11px] text-emerald-300/80">
                  Работник подтвердил — ваша очередь
                </p>
              ) : null}
              {shift.status === 'DISPUTED' ? (
                <div className="mt-2 flex flex-wrap items-start gap-2 rounded-lg border border-amber-400/35 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-50">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>Спор — свяжитесь с поддержкой</span>
                  <Button
                    type="button"
                    variant="link"
                    className="inline h-auto min-h-0 p-0 font-semibold text-white underline shadow-none"
                    onClick={() => window.open('mailto:Event-Unity@yandex.ru', '_blank')}
                  >
                    Event-Unity@yandex.ru
                  </Button>
                </div>
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
        key: 'rate',
        header: 'Ставка',
        render: (shift) => {
          const rate = shift.booking.rate;
          if (rate != null && rate > 0) {
            return (
              <span className="text-sm text-white/75">
                {Number(rate).toLocaleString('ru-RU')} ₽
              </span>
            );
          }
          return <span className="text-white/35">—</span>;
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
            onCancel={handleCancel}
            onFail={(id) => setFailShiftId(id)}
            onEdit={(s) => setEditShift(s)}
            confirmingId={confirmingId}
            cancellingId={cancellingId}
          />
        ),
      },
    ];
  }, [currentUserId, confirmingId, cancellingId, handleConfirm, handleCancel]);

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
            {vacancy?.title ?? (s.booking.description ?? 'Смена')}
            {whenRu ? ` · ${whenRu}` : ''}
            {s.booking.location ? ` · ${s.booking.location}` : ''}
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
        const rate = s.booking.rate;
        return (
          <span>
            {rate != null && rate > 0
              ? `${Number(rate).toLocaleString('ru-RU')} ₽`
              : '—'}
          </span>
        );
      },
      actions: (s: Shift) => (
        <ShiftRowActionsBar
          shift={s}
          currentUserId={currentUserId}
          onConfirm={handleConfirm}
          onReview={setReviewShift}
          onCancel={handleCancel}
          onFail={(id) => setFailShiftId(id)}
          onEdit={(sh) => setEditShift(sh)}
          confirmingId={confirmingId}
          cancellingId={cancellingId}
        />
      ),
    }),
    [currentUserId, confirmingId, cancellingId, handleConfirm, handleCancel],
  );

  // ── Count for a given tab key ──────────────────────────────────────────────
  function tabCount(k: ShiftTab): number | undefined {
    if (!counts) return undefined;
    const map: Record<string, number> = {
      active: counts.active,
      pending_confirm: counts.pending_confirm,
      completed: counts.completed,
      archive: counts.archive,
      disputed: counts.disputed,
    };
    return map[k];
  }

  // ── Pending PENDING shifts banner ──────────────────────────────────────────
  const pendingCount = tab === 'active'
    ? shifts.filter((s) => s.status === 'PENDING').length
    : 0;

  return (
    <div className="min-w-0">
      <h1 className="text-2xl font-bold tracking-tight text-white md:text-[28px]">Смены</h1>
      <p className="mt-2 max-w-xl text-sm text-white/55">
        Управление назначенными сменами и подтверждение завершения.
      </p>

      {/* ── Tabs ── */}
      <div className="mt-6 overflow-x-auto border-b border-white/[0.08] pb-0">
        <div className="flex min-w-max gap-1 sm:gap-1.5">
          {TABS.map(({ key: k, label }) => {
            const active = tab === k;
            const n = tabCount(k);
            return (
              <Button
                key={k}
                type="button"
                variant="ghostInverse"
                size="sm"
                onClick={() => setFilters({ tab: k, page: 1 })}
                className={cn(
                  'relative inline-flex items-center whitespace-nowrap rounded-t-[11px] px-3 py-2 text-[13px] font-semibold shadow-none sm:px-4 sm:py-2.5',
                  active ? 'bg-white/[0.1] text-white' : 'text-white/50 hover:bg-white/[0.04]',
                )}
              >
                {label}
                {n !== undefined && counts !== null ? (
                  <span
                    className={cn(
                      'ml-2 inline-flex min-h-[20px] min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold',
                      n > 0 ? 'bg-emerald-500 text-black' : 'bg-white/[0.1] text-white/50',
                    )}
                  >
                    {n > 99 ? '99+' : n}
                  </span>
                ) : null}
              </Button>
            );
          })}
        </div>
      </div>

      {/* PENDING shifts hint on active tab */}
      {pendingCount > 0 ? (
        <div className="mt-4 flex items-start gap-3 rounded-[14px] border border-amber-400/25 bg-amber-500/8 px-4 py-3">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <p className="text-sm text-amber-100/90">
            <span className="font-semibold">{pendingCount}</span>{' '}
            {pendingCount === 1 ? 'смена ожидает' : 'смены ожидают'} ответа работника.
            Вы можете отредактировать детали или отменить смену.
          </p>
        </div>
      ) : null}

      {/* ── Filters ── */}
      <div className="mt-4 rounded-[18px] border border-white/[0.08] bg-white/[0.03] p-4 sm:p-5">
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex min-w-0 flex-col text-xs font-medium text-white/52">
            Вакансия
            <select
              value={filters.vacancyId ?? ''}
              onChange={(e) => setFilters({ vacancyId: e.target.value || undefined, page: 1 })}
              className="mt-1.5 min-w-0 rounded-[12px] border border-white/[0.1] bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50"
            >
              <option value="">Все вакансии</option>
              {vacancies.map((v) => (
                <option key={v.id} value={v.id} className="text-gray-900">
                  {v.title}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col text-xs font-medium text-white/52 lg:col-span-2">
            Поиск по работнику
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

      {/* ── Table ── */}
      <div className="mt-6 space-y-4">
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

      {/* ── Pagination ── */}
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
                setFilters({ page: Math.min(pageMeta.totalPages, (filters.page ?? 1) + 1) })
              }
              rightIcon={<ChevronRight className="h-4 w-4" aria-hidden />}
            >
              Далее
            </Button>
          </div>
        </div>
      ) : null}

      {/* ── Modals ── */}
      {editShift ? (
        <EditBookingModal
          bookingId={editShift.booking.id}
          initial={editShift.booking}
          workerName={
            editShift.booking.worker
              ? `${editShift.booking.worker.firstName} ${editShift.booking.worker.lastName}`.trim()
              : 'Работник'
          }
          onClose={() => setEditShift(null)}
          onSaved={() => {
            setEditShift(null);
            void fetchShifts();
          }}
        />
      ) : failShiftId ? (
        <FailModal
          shiftId={failShiftId}
          onClose={() => setFailShiftId(null)}
          onDone={() => void fetchShifts()}
        />
      ) : reviewShift ? (
        <ReviewModal
          shiftId={reviewShift.id}
          workerName={
            `${reviewShift.booking.worker?.firstName ?? ''} ${reviewShift.booking.worker?.lastName ?? ''}`.trim() ||
            'Работник'
          }
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

// ─── Page export ──────────────────────────────────────────────────────────────
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
