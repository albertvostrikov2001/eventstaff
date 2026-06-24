'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  MapPin, Star, Briefcase, BookOpen, Plane,
  Heart, CheckCircle, Calendar, Languages, Clock,
  ChevronLeft, ChevronRight, Crown,
} from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { STAFF_CATEGORIES, WORKER_LEVELS } from '@unity/shared';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/lib/api/client';
import { OpenChatButton } from '@/components/chat/OpenChatButton';
import { useToast } from '@/components/ui/toast-context';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { PhotoLightbox } from '@/components/media/PhotoLightbox';
import { config } from '@/lib/config';
import { resolveMediaUrl } from '@/lib/media/url';
import { pluralRu, yearsLabel } from '@/lib/utils';
import {
  useEmployerFavoriteWorkerIdsQuery,
  useIsEmployerFavoritesLoaded,
  useToggleEmployerFavorite,
} from '@/hooks/useEmployerFavoriteWorkerIds';

const API = config.apiUrl;

const RATE_SUFFIXES: Record<string, string> = {
  per_shift: 'смена',
  monthly: 'мес',
  hourly: 'ч',
  fixed: 'фикс.',
  daily: 'день',
  weekly: 'неделя',
  after_event: 'мероприятие',
};

interface AvailabilityEntry {
  date: string;      // 'YYYY-MM-DD'
  isBlocked: boolean;
  isBooked: boolean;
}

interface WorkerDetail {
  id: string;
  userId: string;
  slug: string;
  firstName: string;
  lastName: string;
  age: number | null;
  photoUrl: string | null;
  bio: string | null;
  cityId: string | null;
  city: { name: string; region: string | null } | null;
  categories: { category: string; level: string; specialization: string | null }[];
  experienceYears: number;
  desiredRate: string | null;
  rateType: string | null;
  hasMedicalBook: boolean;
  willingToTravel: boolean;
  overtimeReady: boolean;
  isVerified: boolean;
  isPremium?: boolean;
  isRecommended?: boolean;
  ratingScore: string;
  totalReviews: number;
  totalShifts: number;
  languages: string[];
  dressSizes: string | null;
  workHistory: {
    id: string;
    title: string;
    company: string | null;
    description: string | null;
    dateFrom: string;
    dateTo: string | null;
  }[];
  portfolio: { id: string; url: string }[];
  availability?: AvailabilityEntry[];
}

// ─── Мини-календарь доступности (только для чтения) ────────────────────────
const MINI_WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MINI_MONTHS = [
  'Январь','Февраль','Март','Апрель','Май','Июнь',
  'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь',
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return (new Date(year, month, 1).getDay() + 6) % 7; // Пн = 0
}

function AvailabilityCalendar({ availability }: { availability: AvailabilityEntry[] }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const availMap = new Map(availability.map((a) => [a.date, a]));
  const todayStr = today.toISOString().split('T')[0];

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const hasAnyData = availability.some((a) => {
    const d = new Date(a.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  return (
    <div className="rounded-card border border-white/[0.08] bg-white/[0.04] p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/85">
        <Calendar className="h-4 w-4 text-[var(--accent)]" />
        Доступность
      </h2>

      {/* Навигация */}
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="rounded p-0.5 text-white/40 hover:bg-white/[0.08]"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs font-medium text-white/70">
          {MINI_MONTHS[month]} {year}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="rounded p-0.5 text-white/40 hover:bg-white/[0.08]"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Сетка */}
      <div className="grid grid-cols-7 gap-0.5">
        {MINI_WEEKDAYS.map((d) => (
          <div key={d} className="py-0.5 text-center text-[9px] font-medium text-white/40">
            {d}
          </div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`e${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const entry = availMap.get(dateStr);
          const isPast = dateStr < todayStr;
          const isToday = dateStr === todayStr;

          let cellCls = 'h-7 w-full rounded text-[10px] font-medium flex items-center justify-center select-none';
          if (entry?.isBooked) {
            cellCls += ' bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-400/40';
          } else if (entry?.isBlocked) {
            cellCls += ' bg-white/[0.06] text-white/35';
          } else if (entry && !entry.isBlocked && !entry.isBooked) {
            cellCls += ' bg-emerald-500/20 text-emerald-200';
          } else if (isPast) {
            cellCls += ' text-white/25';
          } else if (isToday) {
            cellCls += ' ring-1 ring-[var(--accent)] text-white/80';
          } else {
            cellCls += ' text-white/55';
          }

          return (
            <div key={day} className={cellCls} title={
              entry?.isBooked ? 'Занят (смена)' :
              entry?.isBlocked ? 'Недоступен' :
              entry ? 'Свободен' : undefined
            }>
              {day}
            </div>
          );
        })}
      </div>

      {/* Легенда */}
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-white/50">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/30 ring-1 ring-emerald-400/40" />
          Свободен
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-indigo-500/30 ring-1 ring-indigo-400/40" />
          Занят (смена)
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-white/[0.08] ring-1 ring-white/20" />
          Недоступен
        </span>
      </div>

      {!hasAnyData && (
        <p className="mt-2 text-center text-[11px] text-white/40">
          Специалист не указал доступность на этот месяц
        </p>
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
}

export function WorkerDetailPageClient() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuthStore();
  const { toast } = useToast();

  const [worker, setWorker] = useState<WorkerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);


  type RevRow = {
    id: string;
    overallScore: number;
    comment: string | null;
    reviewer: {
      id: string;
      workerProfile?: { firstName: string; lastName: string } | null;
      employerProfile?: { companyName: string | null } | null;
    };
  };
  const [reviews, setReviews] = useState<RevRow[] | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewBlock, setReviewBlock] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/catalog/workers/${id}`, { credentials: 'include' })
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((j) => { if (j) setWorker(j.data); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);


  useEffect(() => {
    if (!worker?.userId) return;
    setReviewsLoading(true);
    setReviewBlock(null);
    setReviews(null);
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    const req = isAuthenticated
      ? fetch(`${API}/users/${worker.userId}/reviews?limit=20&page=1`, { credentials: 'include', headers })
      : fetch(`${API}/users/${worker.userId}/reviews?limit=20&page=1`);
    void req
      .then(async (r) => {
        const j = (await r.json().catch(() => ({}))) as {
          data?: unknown[];
          error?: { code?: string; message?: string; upgradeTo?: string };
        };
        if (r.status === 403 && j.error?.code === 'LIMIT_EXCEEDED') {
          setReviewBlock(
            'Вы просмотрели максимальное число профилей по текущему плану. Расширьте доступ для просмотра отзывов.',
          );
          return;
        }
        if (!r.ok) {
          setReviewBlock(null);
          return;
        }
        setReviews((j.data as RevRow[]) ?? []);
      })
      .catch(() => setReviews(null))
      .finally(() => setReviewsLoading(false));
  }, [worker?.userId, isAuthenticated, worker]);

  const favEnabled = useIsEmployerFavoritesLoaded();
  const { data: favIds = [] } = useEmployerFavoriteWorkerIdsQuery(favEnabled);
  const favMutation = useToggleEmployerFavorite();
  const isFavorite = worker ? favIds.includes(worker.id) : false;

  const toggleFavorite = async () => {
    if (!worker) return;
    const nextAdd = !isFavorite;
    try {
      await favMutation.mutateAsync({ workerId: worker.id, add: nextAdd });
      toast(nextAdd ? 'Добавлено в избранное' : 'Удалено из избранного', 'success');
    } catch {
      toast('Ошибка обновления избранного', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--u-bg-dark)' }}>
        <div className="container-page py-10">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 rounded bg-white/10" />
            <div className="rounded-card border border-white/[0.08] bg-white/[0.04] p-6">
              <div className="flex gap-5">
                <div className="h-24 w-24 rounded-full bg-white/10" />
                <div className="flex-1 space-y-3">
                  <div className="h-6 w-56 rounded bg-white/10" />
                  <div className="h-4 w-32 rounded bg-white/10" />
                  <div className="h-4 w-48 rounded bg-white/10" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !worker) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--u-bg-dark)' }}>
        <div className="container-page py-20 text-center">
          <p className="text-2xl font-bold text-white/90">Профиль не найден</p>
          <p className="mt-2 text-white/50">Возможно, специалист скрыл свой профиль</p>
          <Link href="/workers" className="mt-6 inline-block rounded-input bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-600">
            Назад к каталогу
          </Link>
        </div>
      </div>
    );
  }

  const mainCategory = worker.categories[0];
  const categoryLabel = mainCategory
    ? STAFF_CATEGORIES[mainCategory.category as keyof typeof STAFF_CATEGORIES] ?? mainCategory.category
    : null;

  const rateLabel = worker.rateType ? (RATE_SUFFIXES[worker.rateType] ?? worker.rateType) : 'ч';

  return (
    <div className="min-h-screen" style={{ background: 'var(--u-bg-dark)' }}>
    <div className="container-page py-8">
      <Breadcrumbs
        items={[
          { label: 'Главная', href: '/' },
          { label: 'Специалисты', href: '/workers' },
          { label: `${worker.firstName} ${worker.lastName}` },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-card border border-white/[0.08] bg-white/[0.04] p-6">
            <div className="flex items-start gap-5">
              <PhotoLightbox
                src={worker.photoUrl}
                alt={`${worker.firstName} ${worker.lastName}`}
                className="shrink-0 rounded-full"
                disabled={!worker.photoUrl}
              >
                <UserAvatar
                  src={worker.photoUrl}
                  name={`${worker.firstName} ${worker.lastName}`}
                  size={80}
                  className="h-24 w-24 shrink-0"
                />
              </PhotoLightbox>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-white">
                    {worker.firstName} {worker.lastName}
                  </h1>
                  {worker.isVerified && (
                    <span title="Верифицирован">
                      <CheckCircle className="h-5 w-5 text-[var(--accent)]" aria-hidden />
                    </span>
                  )}
                  {worker.isPremium && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-300">
                      <Crown className="h-3 w-3" />
                      Premium
                    </span>
                  )}
                  {worker.isRecommended && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-300">
                      <Star className="h-3 w-3" />
                      Рекомендован
                    </span>
                  )}
                  {worker.age && (
                    <span className="text-sm text-white/40">{worker.age} {pluralRu(worker.age, ['год', 'года', 'лет'])}</span>
                  )}
                </div>

                {categoryLabel && (
                  <span className="mt-1 inline-block rounded-badge border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-sm font-medium text-emerald-300">
                    {categoryLabel}
                  </span>
                )}

                <div className="mt-3 flex flex-wrap gap-4 text-sm text-white/50">
                  {worker.city && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      {worker.city.name}
                      {worker.city.region && `, ${worker.city.region}`}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-semibold text-white/80">{Number(worker.ratingScore).toFixed(1)}</span>
                    <span>({worker.totalReviews} {pluralRu(worker.totalReviews, ['отзыв', 'отзыва', 'отзывов'])})</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4" />
                    {worker.experienceYears === 0 ? 'Без опыта' : `${yearsLabel(worker.experienceYears)} опыта`}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {worker.totalShifts} {pluralRu(worker.totalShifts, ['смена', 'смены', 'смен'])}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {worker.hasMedicalBook && (
                    <span className="flex items-center gap-1 rounded-badge bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300">
                      <BookOpen className="h-3 w-3" />
                      Медкнижка
                    </span>
                  )}
                  {worker.willingToTravel && (
                    <span className="flex items-center gap-1 rounded-badge bg-sky-500/15 px-2 py-0.5 text-xs font-medium text-sky-300">
                      <Plane className="h-3 w-3" />
                      Готов к выезду
                    </span>
                  )}
                  {worker.overtimeReady && (
                    <span className="flex items-center gap-1 rounded-badge bg-orange-500/15 px-2 py-0.5 text-xs font-medium text-orange-300">
                      <Clock className="h-3 w-3" />
                      Готов к переработкам
                    </span>
                  )}
                </div>
              </div>
            </div>

            {worker.bio && (
              <p className="mt-5 border-t border-white/[0.08] pt-5 text-sm leading-relaxed text-white/70">
                {worker.bio}
              </p>
            )}
          </div>

          {worker.portfolio && worker.portfolio.length > 0 && (
            <div className="rounded-card border border-white/[0.08] bg-white/[0.04] p-6">
              <h2 className="mb-4 text-base font-semibold text-white">Портфолио</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {worker.portfolio.map((photo) => {
                  const src = resolveMediaUrl(photo.url);
                  if (!src) return null;
                  return (
                  <button
                    key={photo.id}
                    type="button"
                    className="relative aspect-square overflow-hidden rounded-lg bg-white/[0.06]"
                    onClick={() => setLightboxUrl(src)}
                  >
                    <Image
                      src={src}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, 200px"
                      unoptimized
                    />
                  </button>
                  );
                })}
              </div>
            </div>
          )}

          {worker.categories.length > 0 && (
            <div className="rounded-card border border-white/[0.08] bg-white/[0.04] p-6">
              <h2 className="mb-4 text-base font-semibold text-white">Специализации</h2>
              <div className="space-y-3">
                {worker.categories.map((cat, i) => (
                  <div key={i} className="flex items-center justify-between rounded-input bg-white/[0.06] px-4 py-3">
                    <div>
                      <span className="font-medium text-white/85">
                        {STAFF_CATEGORIES[cat.category as keyof typeof STAFF_CATEGORIES] ?? cat.category}
                      </span>
                      {cat.specialization && (
                        <span className="ml-2 text-sm text-white/50">— {cat.specialization}</span>
                      )}
                    </div>
                    <span className={`rounded-badge px-2 py-0.5 text-xs font-medium ${
                      cat.level === 'expert'
                        ? 'bg-purple-500/15 text-purple-300'
                        : cat.level === 'experienced'
                        ? 'bg-sky-500/15 text-sky-300'
                        : 'bg-white/[0.08] text-white/60'
                    }`}>
                      {WORKER_LEVELS[cat.level as keyof typeof WORKER_LEVELS] ?? cat.level}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-card border border-white/[0.08] bg-white/[0.04] p-6">
            <h2 className="mb-4 text-base font-semibold text-white">Отзывы смен</h2>
            {reviewBlock && user?.activeRole === 'employer' && (
              <div className="rounded-input border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                <p>{reviewBlock}</p>
                <Link
                  href="/request"
                  className="mt-2 inline-block text-sm font-semibold text-amber-300 underline"
                >
                  Расширить доступ
                </Link>
              </div>
            )}
            {reviewsLoading && !reviewBlock && <div className="h-20 animate-pulse rounded bg-white/[0.06]" />}
            {!reviewsLoading && !reviewBlock && reviews && reviews.length === 0 && (
              <p className="text-sm text-white/50">Пока нет отзывов смен, видимых в каталоге</p>
            )}
            {!reviewBlock && reviews && reviews.length > 0 && (
              <ul className="space-y-3">
                {reviews.map((rev) => {
                  const name =
                    rev.reviewer.workerProfile
                      ? `${rev.reviewer.workerProfile.firstName} ${rev.reviewer.workerProfile.lastName}`.trim()
                      : rev.reviewer.employerProfile?.companyName || 'Участник';
                  return (
                    <li key={rev.id} className="border-b border-white/[0.08] pb-3 last:border-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white/85">{name}</span>
                        <span className="text-sm font-semibold text-amber-300">
                          {Number(rev.overallScore).toFixed(1)}
                        </span>
                      </div>
                      {rev.comment && <p className="mt-1 text-sm text-white/65">{rev.comment}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {worker.workHistory.length > 0 && (
            <div className="rounded-card border border-white/[0.08] bg-white/[0.04] p-6">
              <h2 className="mb-4 text-base font-semibold text-white">Опыт работы</h2>
              <div className="space-y-4">
                {worker.workHistory.map((wh) => (
                  <div key={wh.id} className="border-l-2 border-emerald-500/30 pl-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-white/85">{wh.title}</p>
                        {wh.company && <p className="text-sm text-[var(--accent)]">{wh.company}</p>}
                        {wh.description && <p className="mt-1 text-sm text-white/50">{wh.description}</p>}
                      </div>
                      <span className="shrink-0 text-xs text-white/40">
                        {formatDate(wh.dateFrom)} — {wh.dateTo ? formatDate(wh.dateTo) : 'наст. время'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {worker.desiredRate && (
            <div className="rounded-card border border-white/[0.08] bg-white/[0.04] p-5">
              <p className="text-sm text-white/50">Желаемая ставка</p>
              <p className="mt-1 text-3xl font-bold text-white">
                {Number(worker.desiredRate).toLocaleString('ru-RU')} ₽
                <span className="text-base font-normal text-white/50">/{rateLabel}</span>
              </p>
            </div>
          )}

          {isAuthenticated && user?.activeRole === 'employer' && (
            <div className="rounded-card border border-white/[0.08] bg-white/[0.04] p-5 space-y-3">
              <button
                onClick={toggleFavorite}
                disabled={favMutation.isPending}
                className={`flex w-full items-center justify-center gap-2 rounded-input border px-4 py-2.5 text-sm font-medium transition ${
                  isFavorite
                    ? 'border-red-500/40 bg-red-500/15 text-red-300 hover:bg-red-500/20'
                    : 'border-white/15 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]'
                }`}
              >
                <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                {isFavorite ? 'В избранном' : 'В избранное'}
              </button>
              <OpenChatButton
                recipientUserId={worker.userId}
                className="flex w-full items-center justify-center gap-2 rounded-input bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-60"
              />
            </div>
          )}

          {!isAuthenticated && (
            <div className="rounded-card border border-white/[0.08] bg-white/[0.04] p-5 text-center">
              <p className="text-sm text-white/50">Войдите, чтобы связаться со специалистом</p>
              <Link
                href="/auth/login"
                className="mt-3 inline-block rounded-input bg-primary-500 px-6 py-2 text-sm font-semibold text-white hover:bg-primary-600"
              >
                Войти
              </Link>
            </div>
          )}

          {worker.availability && worker.availability.length > 0 && (
            <AvailabilityCalendar availability={worker.availability} />
          )}

          <div className="rounded-card border border-white/[0.08] bg-white/[0.04] p-5 space-y-3 text-sm">
            {worker.languages.length > 0 && (
              <div className="flex items-start gap-2">
                <Languages className="mt-0.5 h-4 w-4 shrink-0 text-white/40" />
                <div>
                  <p className="font-medium text-white/75">Языки</p>
                  <p className="text-white/50">{worker.languages.join(', ')}</p>
                </div>
              </div>
            )}
            {worker.dressSizes && (
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-white/40 text-base leading-none">👔</span>
                <div>
                  <p className="font-medium text-white/75">Размер одежды</p>
                  <p className="text-white/50">{worker.dressSizes}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {lightboxUrl ? (
        <button
          type="button"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxUrl(null)}
          aria-label="Закрыть"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt=""
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </button>
      ) : null}
    </div>
    </div>
  );
}
