'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import {
  Briefcase,
  Building2,
  Calendar,
  MapPin,
  AlertTriangle,
  MessageSquare,
  Star,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────

interface ShiftBooking {
  date?: string | null;
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

// ─── Review Modal ───────────────────────────────────────────────────────────

interface ReviewModalProps {
  shiftId: string;
  onClose: () => void;
  onSaved: () => void;
}

const REVIEW_CRITERIA: { key: keyof ReviewScores; label: string }[] = [
  { key: 'punctuality', label: 'Своевременная оплата' },
  { key: 'jobMatch', label: 'Соответствие описанию вакансии' },
  { key: 'communication', label: 'Коммуникация' },
  { key: 'workQuality', label: 'Организация мероприятия' },
  { key: 'termsCompliance', label: 'Соблюдение договорённостей' },
];

interface ReviewScores {
  punctuality: number;
  jobMatch: number;
  communication: number;
  workQuality: number;
  termsCompliance: number;
}

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`text-xl transition ${n <= value ? 'text-amber-400' : 'text-gray-300 hover:text-amber-200'}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function ReviewModal({ shiftId, onClose, onSaved }: ReviewModalProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 mx-4 w-full max-w-md rounded-modal border border-white/10 bg-[#0f1f17] p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold text-white">Оценить работодателя</h3>

        <div className="space-y-4">
          {REVIEW_CRITERIA.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <span className="text-sm text-white/70">{label}</span>
              <StarRating value={scores[key]} onChange={(v) => setScores((s) => ({ ...s, [key]: v }))} />
            </div>
          ))}

          <div>
            <label className="mb-1.5 block text-sm text-white/70">
              Комментарий (необязательно)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={4000}
              placeholder="Поделитесь впечатлением..."
              className="w-full rounded-input border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-primary-400/50 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-input border border-white/20 py-2.5 text-sm text-white/70 hover:border-white/40"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !allFilled}
            className="flex-1 rounded-input bg-primary-500 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {saving ? 'Сохраняем...' : 'Сохранить оценку'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Shift Card ─────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Ожидает начала', color: 'bg-gray-100/10 text-gray-300' },
  ACTIVE: { label: 'Идёт сейчас', color: 'bg-blue-500/20 text-blue-300' },
  COMPLETED: { label: 'Завершена', color: 'bg-green-500/20 text-green-300' },
  FAILED: { label: 'Не выполнена', color: 'bg-red-500/20 text-red-300' },
  CANCELLED: { label: 'Отменена', color: 'bg-gray-500/20 text-gray-400' },
  DISPUTED: { label: 'Спорная ситуация', color: 'bg-amber-500/20 text-amber-300' },
};

interface ShiftCardProps {
  shift: Shift;
  currentUserId: string;
  onConfirm: (id: string) => void;
  onReview: (id: string) => void;
  confirmingId: string | null;
}

function ShiftCard({ shift, currentUserId, onConfirm, onReview, confirmingId }: ShiftCardProps) {
  const st = STATUS_MAP[shift.status] ?? { label: shift.status, color: 'bg-gray-100/10 text-gray-300' };
  const vacancy = shift.booking.linkedVacancy;
  const employer = shift.booking.employer;
  const companyName = employer?.companyName ?? employer?.contactName ?? 'Работодатель';

  const dateStr = vacancy?.dateStart
    ? new Date(vacancy.dateStart).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : shift.booking.date
    ? new Date(shift.booking.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
    : null;

  const location = vacancy?.address ?? shift.booking.location;
  const payment = shift.payments[0];
  const alreadyReviewed = shift.reviews.some((r) => r.reviewerId === currentUserId);

  const canConfirm =
    ['ACTIVE', 'PENDING', 'DISPUTED'].includes(shift.status) && !shift.workerConfirmed;
  const canReview = shift.status === 'COMPLETED' && !alreadyReviewed;

  return (
    <div className="rounded-card border border-white/[0.08] bg-white/[0.04] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-white">
            {vacancy?.title ?? shift.booking.description ?? 'Смена'}
          </h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-white/60">
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            {companyName}
          </p>
        </div>
        <span className={`shrink-0 rounded-badge px-2.5 py-0.5 text-xs font-medium ${st.color}`}>
          {shift.status === 'DISPUTED' && <AlertTriangle className="mr-1 inline h-3 w-3" />}
          {st.label}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-white/50">
        {dateStr && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> {dateStr}
          </span>
        )}
        {location && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> {location}
          </span>
        )}
        {payment && (
          <span
            className={`flex items-center gap-1 ${
              payment.status === 'COMPLETED' ? 'text-green-400' : 'text-amber-300'
            }`}
          >
            {payment.status === 'COMPLETED' ? (
              <><CheckCircle className="h-3.5 w-3.5" /> Оплачено</>
            ) : (
              <><Clock className="h-3.5 w-3.5" /> Ожидает оплаты</>
            )}
          </span>
        )}
      </div>

      {shift.status === 'DISPUTED' && (
        <div className="mt-3 rounded-input border border-amber-500/30 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
          <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
          Смена в спорном статусе. Администратор разбирает ситуацию. Вы получите уведомление о решении.
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {canConfirm && (
          <button
            onClick={() => onConfirm(shift.id)}
            disabled={confirmingId === shift.id}
            className="rounded-input bg-primary-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {confirmingId === shift.id ? 'Подтверждаем...' : 'Подтвердить завершение'}
          </button>
        )}
        {canReview && (
          <button
            onClick={() => onReview(shift.id)}
            className="flex items-center gap-1.5 rounded-input border border-amber-400/40 px-4 py-1.5 text-xs font-semibold text-amber-300 hover:border-amber-400/70"
          >
            <Star className="h-3.5 w-3.5" /> Оценить работодателя
          </button>
        )}
        {vacancy?.id && (
          <Link
            href={`/worker/messages`}
            className="flex items-center gap-1.5 rounded-input border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:border-white/30"
          >
            <MessageSquare className="h-3.5 w-3.5" /> Чат
          </Link>
        )}
      </div>

      {!canConfirm && shift.status === 'ACTIVE' && shift.workerConfirmed && (
        <p className="mt-2 text-xs text-white/40">
          ✓ Вы подтвердили. Ожидаем подтверждения работодателя.
        </p>
      )}
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: string }) {
  const messages: Record<string, string> = {
    active: 'У вас нет активных смен',
    completed: 'Нет завершённых смен',
    cancelled: 'Нет отменённых смен',
  };
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Briefcase className="mb-4 h-12 w-12 text-white/40" />
      <p className="text-sm text-white/50">{messages[tab] ?? 'Нет смен'}</p>
      {tab === 'active' && (
        <Link
          href="/vacancies"
          className="mt-4 rounded-input bg-primary-500 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-600"
        >
          Найти вакансии
        </Link>
      )}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'active', label: 'Активные' },
  { key: 'completed', label: 'Завершённые' },
  { key: 'cancelled', label: 'Отменённые' },
] as const;

type Tab = (typeof TABS)[number]['key'];

export default function WorkerShiftsPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('active');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [reviewShiftId, setReviewShiftId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState('');

  useEffect(() => {
    // Get current userId for review check
    apiClient
      .get<{ data: { user: { id: string } } }>('/auth/me')
      .then((r) => setCurrentUserId(r.data.user.id))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    apiClient
      .get<{ data: Shift[]; meta: Meta }>('/worker/shifts', { status: tab, page })
      .then((r) => {
        setShifts(r.data);
        setMeta(r.meta!);
      })
      .catch(() => toast('Ошибка загрузки смен', 'error'))
      .finally(() => setLoading(false));
  }, [tab, page, toast]);

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);
    setPage(1);
  };

  const handleConfirm = async (shiftId: string) => {
    setConfirmingId(shiftId);
    try {
      const res = await apiClient.post<{ data: Shift }>(`/shifts/${shiftId}/confirm`);
      const updated = res.data;
      setShifts((prev) => prev.map((s) => (s.id === shiftId ? { ...s, ...updated } : s)));
      if (updated.workerConfirmed && updated.employerConfirmed) {
        toast('Смена завершена! Обе стороны подтвердили.', 'success');
      } else {
        toast('Завершение подтверждено. Ожидаем подтверждения работодателя.', 'success');
      }
    } catch {
      toast('Ошибка подтверждения', 'error');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleReviewSaved = () => {
    setReviewShiftId(null);
    // Refresh the shift to remove the review button
    if (tab === 'completed') {
      setLoading(true);
      apiClient
        .get<{ data: Shift[]; meta: Meta }>('/worker/shifts', { status: tab, page })
        .then((r) => {
          setShifts(r.data);
          setMeta(r.meta!);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Мои смены</h1>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b border-white/10">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => handleTabChange(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition ${
              tab === t.key
                ? 'border-b-2 border-primary-400 text-primary-300'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="mt-6">
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-card border border-white/5 bg-white/5" />
            ))}
          </div>
        ) : shifts.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <div className="space-y-4">
            {shifts.map((shift) => (
              <ShiftCard
                key={shift.id}
                shift={shift}
                currentUserId={currentUserId}
                onConfirm={handleConfirm}
                onReview={setReviewShiftId}
                confirmingId={confirmingId}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <span className="text-sm text-white/40">{meta.total} смен</span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-full p-1.5 text-white/60 hover:bg-white/10 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-white/50">
                {page} / {meta.totalPages}
              </span>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-full p-1.5 text-white/60 hover:bg-white/10 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewShiftId && (
        <ReviewModal
          shiftId={reviewShiftId}
          onClose={() => setReviewShiftId(null)}
          onSaved={handleReviewSaved}
        />
      )}
    </div>
  );
}
