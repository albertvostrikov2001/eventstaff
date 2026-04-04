'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin, Star, Briefcase, BookOpen, Plane, MessageSquare,
  Heart, ArrowLeft, CheckCircle, Calendar, Languages, Clock,
} from 'lucide-react';
import { STAFF_CATEGORIES, WORKER_LEVELS } from '@unity/shared';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

const RATE_SUFFIXES: Record<string, string> = {
  hourly: 'ч',
  per_shift: 'смена',
  fixed: 'фикс.',
  daily: 'день',
  weekly: 'неделя',
  after_event: 'мероприятие',
};

interface WorkerDetail {
  id: string;
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
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
}

export default function WorkerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { toast } = useToast();

  const [worker, setWorker] = useState<WorkerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

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
    if (!isAuthenticated || user?.activeRole !== 'employer' || !worker) return;
    apiClient
      .get<{ data: { id: string }[] }>('/employer/favorites/workers')
      .then((res) => setIsFavorite(res.data.some((w) => w.id === worker.id)))
      .catch(() => {});
  }, [isAuthenticated, user?.activeRole, worker]);

  const toggleFavorite = async () => {
    if (!worker) return;
    setFavLoading(true);
    try {
      if (isFavorite) {
        await apiClient.delete(`/employer/favorites/workers/${worker.id}`);
        setIsFavorite(false);
        toast('Удалено из избранного', 'success');
      } else {
        await apiClient.post(`/employer/favorites/workers/${worker.id}`);
        setIsFavorite(true);
        toast('Добавлено в избранное', 'success');
      }
    } catch {
      toast('Ошибка обновления избранного', 'error');
    } finally {
      setFavLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container-page py-10">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="rounded-card border border-gray-200 bg-white p-6">
            <div className="flex gap-5">
              <div className="h-24 w-24 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-3">
                <div className="h-6 w-56 rounded bg-gray-200" />
                <div className="h-4 w-32 rounded bg-gray-200" />
                <div className="h-4 w-48 rounded bg-gray-200" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !worker) {
    return (
      <div className="container-page py-20 text-center">
        <p className="text-2xl font-bold text-gray-800">Профиль не найден</p>
        <p className="mt-2 text-gray-500">Возможно, специалист скрыл свой профиль</p>
        <Link href="/workers" className="mt-6 inline-block rounded-input bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-600">
          Назад к каталогу
        </Link>
      </div>
    );
  }

  const mainCategory = worker.categories[0];
  const categoryLabel = mainCategory
    ? STAFF_CATEGORIES[mainCategory.category as keyof typeof STAFF_CATEGORIES] ?? mainCategory.category
    : null;

  const rateLabel = worker.rateType ? (RATE_SUFFIXES[worker.rateType] ?? worker.rateType) : 'ч';

  return (
    <div className="container-page py-8">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад
      </button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* LEFT: main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header card */}
          <div className="rounded-card border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-5">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-primary-100">
                {worker.photoUrl ? (
                  <img src={worker.photoUrl} alt={worker.firstName} className="h-24 w-24 rounded-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-primary-600">{worker.firstName[0]?.toUpperCase()}</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {worker.firstName} {worker.lastName}
                  </h1>
                  {worker.isVerified && (
                    <CheckCircle className="h-5 w-5 text-primary-500" title="Верифицирован" />
                  )}
                  {worker.age && (
                    <span className="text-sm text-gray-400">{worker.age} лет</span>
                  )}
                </div>

                {categoryLabel && (
                  <span className="mt-1 inline-block rounded-badge bg-primary-50 px-2.5 py-0.5 text-sm font-medium text-primary-700">
                    {categoryLabel}
                  </span>
                )}

                <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500">
                  {worker.city && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      {worker.city.name}
                      {worker.city.region && `, ${worker.city.region}`}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-semibold text-gray-700">{Number(worker.ratingScore).toFixed(1)}</span>
                    <span>({worker.totalReviews} отзывов)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4" />
                    {worker.experienceYears === 0 ? 'Без опыта' : `${worker.experienceYears} ${worker.experienceYears === 1 ? 'год' : worker.experienceYears < 5 ? 'года' : 'лет'} опыта`}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {worker.totalShifts} смен
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {worker.hasMedicalBook && (
                    <span className="flex items-center gap-1 rounded-badge bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                      <BookOpen className="h-3 w-3" />
                      Медкнижка
                    </span>
                  )}
                  {worker.willingToTravel && (
                    <span className="flex items-center gap-1 rounded-badge bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      <Plane className="h-3 w-3" />
                      Готов к выезду
                    </span>
                  )}
                  {worker.overtimeReady && (
                    <span className="flex items-center gap-1 rounded-badge bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">
                      <Clock className="h-3 w-3" />
                      Готов к переработкам
                    </span>
                  )}
                </div>
              </div>
            </div>

            {worker.bio && (
              <p className="mt-5 border-t border-gray-100 pt-5 text-sm leading-relaxed text-gray-700">
                {worker.bio}
              </p>
            )}
          </div>

          {/* Specializations */}
          {worker.categories.length > 0 && (
            <div className="rounded-card border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-gray-900">Специализации</h2>
              <div className="space-y-3">
                {worker.categories.map((cat, i) => (
                  <div key={i} className="flex items-center justify-between rounded-input bg-gray-50 px-4 py-3">
                    <div>
                      <span className="font-medium text-gray-800">
                        {STAFF_CATEGORIES[cat.category as keyof typeof STAFF_CATEGORIES] ?? cat.category}
                      </span>
                      {cat.specialization && (
                        <span className="ml-2 text-sm text-gray-500">— {cat.specialization}</span>
                      )}
                    </div>
                    <span className={`rounded-badge px-2 py-0.5 text-xs font-medium ${
                      cat.level === 'expert'
                        ? 'bg-purple-50 text-purple-700'
                        : cat.level === 'experienced'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {WORKER_LEVELS[cat.level as keyof typeof WORKER_LEVELS] ?? cat.level}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Work history */}
          {worker.workHistory.length > 0 && (
            <div className="rounded-card border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-gray-900">Опыт работы</h2>
              <div className="space-y-4">
                {worker.workHistory.map((wh) => (
                  <div key={wh.id} className="border-l-2 border-primary-200 pl-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-gray-800">{wh.title}</p>
                        {wh.company && <p className="text-sm text-primary-600">{wh.company}</p>}
                        {wh.description && <p className="mt-1 text-sm text-gray-500">{wh.description}</p>}
                      </div>
                      <span className="shrink-0 text-xs text-gray-400">
                        {formatDate(wh.dateFrom)} — {wh.dateTo ? formatDate(wh.dateTo) : 'наст. время'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: sidebar */}
        <div className="space-y-4">
          {/* Rate */}
          {worker.desiredRate && (
            <div className="rounded-card border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Желаемая ставка</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">
                {Number(worker.desiredRate).toLocaleString('ru-RU')} ₽
                <span className="text-base font-normal text-gray-500">/{rateLabel}</span>
              </p>
            </div>
          )}

          {/* Actions */}
          {isAuthenticated && user?.activeRole === 'employer' && (
            <div className="rounded-card border border-gray-200 bg-white p-5 shadow-sm space-y-3">
              <button
                onClick={toggleFavorite}
                disabled={favLoading}
                className={`flex w-full items-center justify-center gap-2 rounded-input border px-4 py-2.5 text-sm font-medium transition ${
                  isFavorite
                    ? 'border-red-200 bg-red-50 text-error hover:bg-red-100'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                {isFavorite ? 'В избранном' : 'В избранное'}
              </button>
              <Link
                href="/employer/messages"
                className="flex w-full items-center justify-center gap-2 rounded-input bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-600"
              >
                <MessageSquare className="h-4 w-4" />
                Написать
              </Link>
            </div>
          )}

          {!isAuthenticated && (
            <div className="rounded-card border border-gray-200 bg-white p-5 shadow-sm text-center">
              <p className="text-sm text-gray-500">Войдите, чтобы связаться со специалистом</p>
              <Link
                href="/auth/login"
                className="mt-3 inline-block rounded-input bg-primary-500 px-6 py-2 text-sm font-semibold text-white hover:bg-primary-600"
              >
                Войти
              </Link>
            </div>
          )}

          {/* Extra info */}
          <div className="rounded-card border border-gray-200 bg-white p-5 shadow-sm space-y-3 text-sm">
            {worker.languages.length > 0 && (
              <div className="flex items-start gap-2">
                <Languages className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-700">Языки</p>
                  <p className="text-gray-500">{worker.languages.join(', ')}</p>
                </div>
              </div>
            )}
            {worker.dressSizes && (
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-gray-400 text-base leading-none">👔</span>
                <div>
                  <p className="font-medium text-gray-700">Размер одежды</p>
                  <p className="text-gray-500">{worker.dressSizes}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
