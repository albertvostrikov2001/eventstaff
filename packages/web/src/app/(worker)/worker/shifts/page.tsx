'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import {
  Briefcase,
  Building2,
  Calendar,
  MapPin,
  Star,
  Clock,
  AlertTriangle,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

// ─── Types ─────────────────────────────────────────────────────────────────

interface ShiftBooking {
  id: string;
  date?: string | null;
  timeStart?: string | null;
  timeEnd?: string | null;
  location?: string | null;
  description?: string | null;
  rate?: number | null;
  linkedVacancy?: { id: string; title: string; dateStart?: string; address?: string | null } | null;
  employer?: { companyName?: string | null; contactName?: string | null; logoUrl?: string | null };
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

interface Meta {
  total: number;
  page: number;
  totalPages: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(raw?: string | null) {
  if (!raw) return null;
  return new Date(raw).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTime(t?: string | null) {
  return t ?? null;
}

// ─── Review Modal ────────────────────────────────────────────────────────────

const REVIEW_CRITERIA: { key: string; label: string }[] = [
  { key: 'punctuality', label: 'Своевременная оплата' },
  { key: 'jobMatch', label: 'Соответствие описанию вакансии' },
  { key: 'communication', label: 'Коммуникация' },
  { key: 'workQuality', label: 'Организация мероприятия' },
  { key: 'termsCompliance', label: 'Соблюдение договорённостей' },
];

function ReviewModal({ shiftId, onClose, onSaved }: { shiftId: string; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [scores, setScores] = useState<Record<string, number>>({
    punctuality: 0, jobMatch: 0, communication: 0, workQuality: 0, termsCompliance: 0,
  });
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const allFilled = Object.values(scores).every((v) => v > 0);

  const submit = async () => {
    if (!allFilled) { toast('Оцените все 5 критериев', 'error'); return; }
    setSaving(true);
    try {
      await apiClient.post(`/shifts/${shiftId}/review`, { ...scores, comment: comment || undefined });
      toast('Оценка сохранена', 'success');
      onSaved();
    } catch { toast('Ошибка сохранения оценки', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-[18px] border border-white/[0.1] bg-[#0f1f17] p-6 shadow-xl">
        <h3 className="mb-1 text-lg font-semibold text-white">Оценить работодателя</h3>
        <p className="mb-5 text-sm text-white/50">Оцените по каждому критерию от 1 до 5</p>
        <div className="space-y-4">
          {REVIEW_CRITERIA.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <span className="text-sm text-white/70">{label}</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setScores((s) => ({ ...s, [key]: n }))}
                    className={`text-xl transition ${n <= (scores[key] ?? 0) ? 'text-amber-400' : 'text-white/20 hover:text-amber-200/70'}`}>★</button>
                ))}
              </div>
            </div>
          ))}
          <div>
            <label className="mb-1.5 block text-sm text-white/70">Комментарий (необязательно)</label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={4000}
              placeholder="Поделитесь впечатлением..."
              className="w-full rounded-[8px] border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-emerald-500/50 focus:outline-none" />
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-[10px] border border-white/15 py-2.5 text-sm text-white/60 hover:border-white/30">Отмена</button>
          <button onClick={() => void submit()} disabled={saving || !allFilled}
            className="flex-1 rounded-[10px] bg-emerald-500 py-2.5 text-sm font-semibold text-[#08120e] disabled:opacity-50 hover:bg-emerald-400">
            {saving ? 'Сохраняем…' : 'Сохранить оценку'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Decline modal ───────────────────────────────────────────────────────────

function DeclineModal({ bookingId, onClose, onDeclined }: { bookingId: string; onClose: () => void; onDeclined: () => void }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const confirm = async () => {
    setSaving(true);
    try {
      await apiClient.post(`/bookings/${bookingId}/cancel`, {
        reasonCode: 'other',
        customReason: 'Работник отклонил смену',
      });
      toast('Смена отклонена', 'success');
      onDeclined();
    } catch {
      toast('Не удалось отклонить смену', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-[18px] border border-white/[0.08] bg-[#131f19] p-6 shadow-xl">
        <h3 className="mb-2 text-base font-semibold text-white">Отклонить смену?</h3>
        <p className="mb-5 text-sm text-white/55">
          Вы отклоните назначенную смену. Работодатель получит уведомление.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-[10px] border border-white/15 py-2.5 text-sm text-white/60">Назад</button>
          <button onClick={() => void confirm()} disabled={saving}
            className="flex-1 rounded-[10px] border border-red-500/30 bg-red-500/10 py-2.5 text-sm font-semibold text-red-300 disabled:opacity-50">
            {saving ? 'Отклоняем…' : 'Отклонить'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Pending Shift Card ──────────────────────────────────────────────────────

function PendingShiftCard({ shift, onAccept, onDecline, accepting }: {
  shift: Shift;
  onAccept: () => void;
  onDecline: () => void;
  accepting: boolean;
}) {
  const v = shift.booking.linkedVacancy;
  const employer = shift.booking.employer;
  const companyName = employer?.companyName ?? employer?.contactName ?? 'Работодатель';
  const date = formatDate(v?.dateStart ?? shift.booking.date);
  const timeStr = [formatTime(shift.booking.timeStart), formatTime(shift.booking.timeEnd)].filter(Boolean).join(' – ');
  const location = v?.address ?? shift.booking.location;

  return (
    <div className="rounded-[14px] border-2 border-emerald-500/30 bg-emerald-500/[0.04] p-5">
      {/* "new" badge */}
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
          Новое назначение
        </span>
        <span className="text-[11px] text-white/35">Требуется подтверждение</span>
      </div>

      <h3 className="text-[15px] font-semibold text-white">
        {v?.title ?? shift.booking.description ?? 'Смена'}
      </h3>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-white/55">
        <Building2 className="h-3.5 w-3.5 shrink-0" />
        {companyName}
      </p>

      <div className="mt-3 flex flex-wrap gap-3 text-[13px] text-white/50">
        {date && <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 shrink-0" /> {date}</span>}
        {timeStr && <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 shrink-0" /> {timeStr}</span>}
        {location && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0" /> {location}</span>}
      </div>

      {shift.booking.rate != null && (
        <p className="mt-2 text-sm font-medium text-emerald-300">
          {Number(shift.booking.rate).toLocaleString('ru-RU')} ₽
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button onClick={onAccept} disabled={accepting}
          className="flex items-center gap-2 rounded-[10px] bg-emerald-500 px-4 py-2 text-sm font-semibold text-[#08120e] transition hover:bg-emerald-400 disabled:opacity-50">
          <Check className="h-4 w-4" />
          {accepting ? 'Принимаем…' : 'Принять смену'}
        </button>
        <button onClick={onDecline}
          className="flex items-center gap-2 rounded-[10px] border border-white/10 px-4 py-2 text-sm text-white/60 transition hover:border-red-400/30 hover:text-red-300">
          <X className="h-4 w-4" />
          Отклонить
        </button>
      </div>
    </div>
  );
}

// ─── Regular Shift Card ──────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: 'В работе', cls: 'bg-blue-500/15 text-blue-300' },
  COMPLETED: { label: 'Завершена', cls: 'bg-emerald-500/15 text-emerald-300' },
  FAILED: { label: 'Не выполнена', cls: 'bg-red-500/15 text-red-300' },
  CANCELLED: { label: 'Отменена', cls: 'bg-white/10 text-white/45' },
  DISPUTED: { label: 'Спорная ситуация', cls: 'bg-amber-500/15 text-amber-300' },
};

function ShiftCard({ shift, currentUserId, onReview }: {
  shift: Shift;
  currentUserId: string;
  onReview: (id: string) => void;
}) {
  const cfg = STATUS_CFG[shift.status] ?? { label: shift.status, cls: 'bg-white/10 text-white/45' };
  const v = shift.booking.linkedVacancy;
  const employer = shift.booking.employer;
  const companyName = employer?.companyName ?? employer?.contactName ?? 'Работодатель';
  const date = formatDate(v?.dateStart ?? shift.booking.date);
  const timeStr = [formatTime(shift.booking.timeStart), formatTime(shift.booking.timeEnd)].filter(Boolean).join(' – ');
  const location = v?.address ?? shift.booking.location;
  const alreadyReviewed = shift.reviews.some((r) => r.reviewerId === currentUserId);
  const canReview = shift.status === 'COMPLETED' && !alreadyReviewed;

  return (
    <div className="rounded-[14px] border border-white/[0.07] bg-white/[0.04] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold text-white">
            {v?.title ?? shift.booking.description ?? 'Смена'}
          </h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-white/50">
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            {companyName}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${cfg.cls}`}>
          {shift.status === 'DISPUTED' && <AlertTriangle className="mr-1 inline h-3 w-3" />}
          {cfg.label}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-[13px] text-white/45">
        {date && <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 shrink-0" /> {date}</span>}
        {timeStr && <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 shrink-0" /> {timeStr}</span>}
        {location && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0" /> {location}</span>}
      </div>

      {shift.status === 'ACTIVE' && (
        <div className="mt-3 rounded-[8px] border border-blue-500/20 bg-blue-500/[0.06] px-3 py-2.5 text-[13px] text-blue-200/80">
          <Check className="mr-1.5 inline h-3.5 w-3.5" />
          Вы приняли смену. Выполните работу согласно договорённостям.
        </div>
      )}

      {shift.status === 'DISPUTED' && (
        <div className="mt-3 rounded-[8px] border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2.5 text-[13px] text-amber-200/80">
          <AlertTriangle className="mr-1.5 inline h-3.5 w-3.5" />
          Спорная ситуация. Администратор разбирает. Вы получите уведомление.
        </div>
      )}

      {/* Подтверждение завершения работодателем */}
      {shift.status === 'ACTIVE' && shift.workerConfirmed && !shift.employerConfirmed && (
        <p className="mt-2 text-[12px] text-white/35">
          ✓ Вы подтвердили участие. Ожидаем подтверждения от работодателя по завершении.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {canReview && (
          <button onClick={() => onReview(shift.id)}
            className="flex items-center gap-1.5 rounded-[10px] border border-amber-400/35 px-4 py-1.5 text-[13px] font-semibold text-amber-300 hover:border-amber-400/60">
            <Star className="h-3.5 w-3.5" /> Оценить работодателя
          </button>
        )}
        <Link href="/worker/messages"
          className="flex items-center gap-1.5 rounded-[10px] border border-white/10 px-3 py-1.5 text-[13px] text-white/50 hover:border-white/25 hover:text-white/70">
          <MessageSquare className="h-3.5 w-3.5" /> Чат
        </Link>
      </div>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Briefcase className="mb-4 h-10 w-10 text-white/25" />
      <p className="text-sm text-white/40">{label}</p>
      <Link href="/vacancies"
        className="mt-4 inline-block rounded-[10px] bg-emerald-500 px-5 py-2 text-sm font-semibold text-[#08120e] hover:bg-emerald-400">
        Найти вакансии
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'active', label: 'Мои смены' },
  { key: 'completed', label: 'Завершённые' },
  { key: 'cancelled', label: 'Отменённые' },
] as const;
type Tab = (typeof TABS)[number]['key'];

export default function WorkerShiftsPage() {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const currentUserId = user?.id ?? '';

  const [tab, setTab] = useState<Tab>('active');
  const [allShifts, setAllShifts] = useState<Shift[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Modals
  const [reviewShiftId, setReviewShiftId] = useState<string | null>(null);
  const [declineBookingId, setDeclineBookingId] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    apiClient
      .get<{ data: Shift[]; meta: Meta }>('/worker/shifts', { status: tab, page })
      .then((r) => {
        setAllShifts(r.data);
        setMeta(r.meta!);
      })
      .catch(() => toast('Ошибка загрузки смен', 'error'))
      .finally(() => setLoading(false));
  }, [tab, page, toast]);

  useEffect(() => { load(); }, [load]);

  const handleTabChange = (t: Tab) => { setTab(t); setPage(1); };

  // Accept a pending shift
  const handleAccept = async (shiftId: string) => {
    setAcceptingId(shiftId);
    try {
      await apiClient.post(`/shifts/${shiftId}/confirm`);
      toast('Смена принята! Работодатель получил уведомление.', 'success');
      load();
    } catch {
      toast('Ошибка при принятии смены', 'error');
    } finally {
      setAcceptingId(null);
    }
  };

  // On successful review save
  const handleReviewSaved = () => {
    setReviewShiftId(null);
    load();
  };

  // On decline confirmed
  const handleDeclined = () => {
    setDeclineBookingId(null);
    load();
  };

  // Split pending (PENDING + !workerConfirmed) from the rest
  const pendingShifts = tab === 'active'
    ? allShifts.filter((s) => s.status === 'PENDING' && !s.workerConfirmed)
    : [];
  const regularShifts = tab === 'active'
    ? allShifts.filter((s) => !(s.status === 'PENDING' && !s.workerConfirmed))
    : allShifts;

  const isEmpty = pendingShifts.length === 0 && regularShifts.length === 0 && !loading;

  const emptyLabels: Record<Tab, string> = {
    active: 'У вас нет активных смен',
    completed: 'Нет завершённых смен',
    cancelled: 'Нет отменённых смен',
  };

  return (
    <>
      {/* Modals */}
      {reviewShiftId && (
        <ReviewModal shiftId={reviewShiftId} onClose={() => setReviewShiftId(null)} onSaved={handleReviewSaved} />
      )}
      {declineBookingId && (
        <DeclineModal bookingId={declineBookingId} onClose={() => setDeclineBookingId(null)} onDeclined={handleDeclined} />
      )}

      <div>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white/90">Мои смены</h1>
          <p className="mt-1 text-sm text-white/45">
            Управляйте назначенными сменами и отслеживайте историю
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button key={t.key} type="button" onClick={() => handleTabChange(t.key)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-[13px] font-medium transition ${
                tab === t.key
                  ? 'bg-emerald-500 text-[#08120e]'
                  : 'border border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.06]'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-[14px] bg-white/[0.04]" />
            ))}
          </div>
        ) : isEmpty ? (
          <EmptyState label={emptyLabels[tab]} />
        ) : (
          <div className="space-y-3">
            {/* Pending shifts first — with Accept/Decline */}
            {pendingShifts.length > 0 && (
              <div className="space-y-3">
                {pendingShifts.map((shift) => (
                  <PendingShiftCard
                    key={shift.id}
                    shift={shift}
                    accepting={acceptingId === shift.id}
                    onAccept={() => void handleAccept(shift.id)}
                    onDecline={() => setDeclineBookingId(shift.booking.id)}
                  />
                ))}
                {regularShifts.length > 0 && (
                  <div className="my-2 border-t border-white/[0.06]" />
                )}
              </div>
            )}

            {/* Regular active / completed / cancelled */}
            {regularShifts.map((shift) => (
              <ShiftCard
                key={shift.id}
                shift={shift}
                currentUserId={currentUserId}
                onReview={(id) => setReviewShiftId(id)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
              className="rounded-[8px] border border-white/10 p-2 text-white/55 disabled:opacity-30 hover:bg-white/[0.05]">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-white/45">
              {page} / {meta.totalPages}
            </span>
            <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages}
              className="rounded-[8px] border border-white/10 p-2 text-white/55 disabled:opacity-30 hover:bg-white/[0.05]">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
