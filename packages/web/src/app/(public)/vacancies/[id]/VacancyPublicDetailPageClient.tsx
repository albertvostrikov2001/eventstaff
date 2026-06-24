'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { STAFF_CATEGORIES, RATE_TYPES, EMPLOYMENT_TYPES, BUSINESS_TYPES } from '@unity/shared';
import {
  MapPin,
  Calendar,
  ShieldCheck,
  Clock,
  Users,
  Shirt,
  Utensils,
  Car,
  Coins,
  Star,
  ChevronRight,
  Globe,
  AlignLeft,
  CheckSquare,
  FileText,
  Target,
} from 'lucide-react';
import { formatDateTimeRu } from '@/lib/dates/formatDateTime';
import { EmployerLogoMark } from '@/components/employer/EmployerLogoMark';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { config } from '@/lib/config';
import { useAuthStore } from '@/stores/authStore';
import { useApplyToVacancy } from '@/hooks/useApplyToVacancy';
import { ScheduleConflictDialog } from '@/components/worker/ScheduleConflictDialog';
import { apiClient } from '@/lib/api/client';

const API = config.apiUrl;

interface VacancyPublic {
  id: string;
  title: string;
  category: string;
  employmentType: string;
  rate: string | number;
  rateType: string;
  dateStart: string;
  dateEnd: string | null;
  timeStart: string | null;
  timeEnd: string | null;
  address: string | null;
  lat: string | number | null;
  lng: string | number | null;
  dressCode: string | null;
  description: string | null;
  responsibilities: string | null;
  requirements: string | null;
  conditions: string | null;
  foodProvided: boolean;
  transportProvided: boolean;
  tipsPossible: boolean | null;
  workersNeeded: number;
  isUrgent: boolean;
  status: string;
  employer: {
    id: string;
    slug: string;
    companyName: string | null;
    contactName: string | null;
    logoUrl: string | null;
    isVerified: boolean;
    description: string | null;
    businessType: string | null;
    ratingScore: string | number | null;
    completedShifts?: number;
    website: string | null;
    city?: { name: string } | null;
  };
  city: { name: string } | null;
  _count?: { applications: number };
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
        <Icon className="h-4 w-4 text-white/55" />
      </div>
      <div>
        <p className="text-xs text-white/45">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-white/85">{value}</p>
      </div>
    </div>
  );
}

function TextSection({ title, icon: Icon, content }: { title: string; icon: React.ElementType; content: string }) {
  return (
    <div className="mt-6 border-t border-white/[0.08] pt-6">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-[var(--accent)]" />
        <h2 className="text-sm font-semibold text-white/85">{title}</h2>
      </div>
      <p className="whitespace-pre-line text-sm leading-relaxed text-white/65">{content}</p>
    </div>
  );
}

export function VacancyPublicDetailPageClient() {
  const params = useParams();
  const id = String(params?.id ?? '');
  const [v, setV] = useState<VacancyPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasApplied, setHasApplied] = useState(false);

  const { user, isAuthenticated } = useAuthStore();
  const isWorker = isAuthenticated && user?.activeRole === 'worker';
  const isOwner = !!(user?.employerProfile && v && v.employer.id === user.employerProfile.id);
  const { applyingId, pendingConflict, submit, confirmConflict, dismissConflict } =
    useApplyToVacancy();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`${API}/catalog/vacancies/${id}`, { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) return null;
        return r.json() as Promise<{ data: VacancyPublic }>;
      })
      .then((j) => setV(j?.data ?? null))
      .catch(() => setV(null))
      .finally(() => setLoading(false));
  }, [id]);

  // Determine if current worker already applied to this vacancy
  useEffect(() => {
    if (!isWorker || !id) return;
    apiClient
      .get<{ data: { vacancy: { id: string } }[] }>('/worker/applications', { limit: 200 })
      .then((res) => {
        setHasApplied(res.data.some((a) => a.vacancy?.id === id));
      })
      .catch(() => {});
  }, [isWorker, id]);

  const handleApply = async () => {
    const ok = await submit(id);
    if (ok) setHasApplied(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--u-bg-dark)' }}>
        <div className="container-page py-10">
          <div className="space-y-4">
            <div className="h-8 w-64 animate-pulse rounded bg-white/10" />
            <div className="h-56 w-full animate-pulse rounded-card bg-white/10" />
            <div className="h-40 w-full animate-pulse rounded-card bg-white/10" />
          </div>
        </div>
      </div>
    );
  }

  if (!v || v.status !== 'active') {
    return (
      <div className="min-h-screen" style={{ background: 'var(--u-bg-dark)' }}>
        <div className="container-page py-16 text-center">
          <p className="text-lg font-medium text-white/90">Вакансия не найдена</p>
          <Link href="/vacancies" className="mt-4 inline-block text-sm text-[var(--accent)] hover:underline">
            ← К каталогу
          </Link>
        </div>
      </div>
    );
  }

  const emp = v.employer;
  const empName = emp.companyName ?? emp.contactName ?? 'Работодатель';
  const catLabel = STAFF_CATEGORIES[v.category as keyof typeof STAFF_CATEGORIES] ?? v.category;
  const rateLbl = RATE_TYPES[v.rateType as keyof typeof RATE_TYPES] ?? v.rateType;
  const emplLbl = EMPLOYMENT_TYPES[v.employmentType as keyof typeof EMPLOYMENT_TYPES] ?? v.employmentType;
  const businessLabel = emp.businessType
    ? (BUSINESS_TYPES[emp.businessType as keyof typeof BUSINESS_TYPES] ?? emp.businessType)
    : null;

  const hasLat = v.lat != null && v.lng != null;
  const mapUrl = hasLat
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${Number(v.lng) - 0.01},${Number(v.lat) - 0.008},${Number(v.lng) + 0.01},${Number(v.lat) + 0.008}&layer=mapnik&marker=${Number(v.lat)},${Number(v.lng)}`
    : null;
  const yandexMapLink = v.address
    ? `https://yandex.ru/maps/?text=${encodeURIComponent(v.address)}`
    : hasLat
    ? `https://yandex.ru/maps/?ll=${v.lng},${v.lat}&z=16&pt=${v.lng},${v.lat}`
    : null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--u-bg-dark)' }}>
    <div className="container-page py-8 pb-28 sm:pb-8">
      <Breadcrumbs
        items={[
          { label: 'Главная', href: '/' },
          { label: 'Вакансии', href: '/vacancies' },
          { label: v.title },
        ]}
      />

      {/* ── Apply CTA banner ── */}
      <div className="mb-4 flex flex-col gap-3 rounded-card border border-emerald-500/30 bg-emerald-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">
            {hasApplied ? 'Вы откликнулись на эту вакансию' : `Заработок: ${Number(v.rate).toLocaleString('ru-RU')} ₽ — ${rateLbl}`}
          </p>
          <p className="mt-0.5 text-xs text-white/65">
            {hasApplied
              ? 'Следите за статусом в личном кабинете'
              : 'Откликнитесь — работодатель свяжется с вами'}
          </p>
        </div>
        <div className="shrink-0">
          {isOwner ? (
            <Link
              href={`/employer/vacancies/${v.id}/applications`}
              className="inline-flex items-center justify-center rounded-input border border-white/15 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:border-white/30"
            >
              Смотреть отклики
            </Link>
          ) : isWorker ? (
            hasApplied ? (
              <span className="inline-flex items-center gap-1.5 rounded-input bg-emerald-500/15 px-5 py-2.5 text-sm font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
                Отклик отправлен
              </span>
            ) : (
              <button
                type="button"
                onClick={handleApply}
                disabled={applyingId === id}
                className="inline-flex w-full items-center justify-center rounded-input bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {applyingId === id ? 'Отправляем…' : 'Откликнуться'}
              </button>
            )
          ) : isAuthenticated ? (
            <span className="text-sm text-white/50">Откликаться могут только специалисты</span>
          ) : (
            <Link
              href={`/auth/register?role=worker&returnTo=${encodeURIComponent(`/vacancies/${v.id}`)}&apply=${v.id}`}
              className="inline-flex w-full items-center justify-center rounded-input bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600 sm:w-auto"
            >
              Войти и откликнуться
            </Link>
          )}
        </div>
      </div>

      {/* ── Main card ── */}
      <article className="rounded-card border border-white/[0.08] bg-white/[0.04] p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            <EmployerLogoMark
              logoUrl={emp.logoUrl}
              companyName={emp.companyName}
              contactName={emp.contactName}
              size="lg"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-white">{v.title}</h1>
                {v.isUrgent && (
                  <span className="rounded-badge bg-red-500/15 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-red-300">
                    Срочно
                  </span>
                )}
              </div>
              <Link
                href={`/employers/${emp.slug}`}
                className="mt-1 inline-flex items-center gap-1 text-sm text-[var(--accent)] hover:underline"
              >
                {empName}
                {emp.isVerified && (
                  <span title="Верифицирован" className="inline-flex">
                    <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
                  </span>
                )}
              </Link>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/50">
                <span className="rounded-badge border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 font-medium text-emerald-300">{catLabel}</span>
                <span className="rounded-badge bg-white/[0.06] px-2 py-0.5 text-white/60">{emplLbl}</span>
                {v.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {v.city.name}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="shrink-0 rounded-input bg-white/[0.06] px-4 py-3 text-right">
            <div className="text-2xl font-bold text-white">{Number(v.rate).toLocaleString('ru-RU')} ₽</div>
            <div className="text-xs text-white/50">{rateLbl}</div>
            {v.workersNeeded > 1 && (
              <div className="mt-1 flex items-center justify-end gap-1 text-xs text-white/50">
                <Users className="h-3 w-3" />
                {v.workersNeeded} мест
              </div>
            )}
          </div>
        </div>

        {/* ── Key details grid ── */}
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/[0.08] pt-6 sm:grid-cols-3 lg:grid-cols-4">
          <InfoRow
            icon={Calendar}
            label="Дата начала"
            value={formatDateTimeRu(v.dateStart, 'date')}
          />
          {v.dateEnd && (
            <InfoRow
              icon={Calendar}
              label="Дата окончания"
              value={formatDateTimeRu(v.dateEnd, 'date')}
            />
          )}
          {(v.timeStart || v.timeEnd) && (
            <InfoRow
              icon={Clock}
              label="Время смены"
              value={[v.timeStart, v.timeEnd].filter(Boolean).join(' – ')}
            />
          )}
          {v.dressCode && (
            <InfoRow icon={Shirt} label="Дресс-код" value={v.dressCode} />
          )}
          {v.foodProvided && (
            <InfoRow icon={Utensils} label="Питание" value="Предоставляется" />
          )}
          {v.transportProvided && (
            <InfoRow icon={Car} label="Трансфер" value="Предоставляется" />
          )}
          {v.tipsPossible && (
            <InfoRow icon={Coins} label="Чаевые" value="Возможны" />
          )}
        </div>

        {/* Description */}
        {v.description && (
          <TextSection title="Описание" icon={AlignLeft} content={v.description} />
        )}

        {/* Responsibilities */}
        {v.responsibilities && (
          <TextSection title="Обязанности" icon={CheckSquare} content={v.responsibilities} />
        )}

        {/* Requirements */}
        {v.requirements && (
          <TextSection title="Требования" icon={Target} content={v.requirements} />
        )}

        {/* Conditions */}
        {v.conditions && (
          <TextSection title="Условия" icon={FileText} content={v.conditions} />
        )}

        {/* ── Location ── */}
        {(v.address || hasLat) && (
          <div className="mt-6 border-t border-white/[0.08] pt-6">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[var(--accent)]" />
                <h2 className="text-sm font-semibold text-white/85">Место проведения</h2>
              </div>
              {yandexMapLink && (
                <a
                  href={yandexMapLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
                >
                  Открыть на карте <ChevronRight className="h-3 w-3" />
                </a>
              )}
            </div>
            {v.address && (
              <p className="mb-3 text-sm text-white/70">{v.address}</p>
            )}
            {mapUrl && (
              <div className="overflow-hidden rounded-xl border border-white/[0.12]">
                <iframe
                  src={mapUrl}
                  width="100%"
                  height="280"
                  className="block"
                  style={{ border: 'none' }}
                  title="Место проведения"
                  loading="lazy"
                />
              </div>
            )}
            {!mapUrl && yandexMapLink && (
              <a
                href={yandexMapLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-input border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/70 transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                <MapPin className="h-4 w-4" />
                Открыть адрес на карте
              </a>
            )}
          </div>
        )}
      </article>

      {/* ── Employer card ── */}
      <section className="mt-4 rounded-card border border-white/[0.08] bg-white/[0.04] p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/45">
          О работодателе
        </h2>
        <div className="flex items-start gap-4">
          <EmployerLogoMark
            logoUrl={emp.logoUrl}
            companyName={emp.companyName}
            contactName={emp.contactName}
            size="md"
          />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/employers/${emp.slug}`}
                className="font-semibold text-white/90 hover:text-[var(--accent)]"
              >
                {empName}
              </Link>
              {emp.isVerified && (
                <span className="inline-flex items-center gap-1 rounded-badge bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Проверен
                </span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-white/50">
              {businessLabel && (
                <span className="rounded-badge bg-white/[0.06] px-2 py-0.5 text-white/60">{businessLabel}</span>
              )}
              {emp.ratingScore != null && Number(emp.ratingScore) > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {Number(emp.ratingScore).toFixed(1)}
                </span>
              )}
              {emp.completedShifts != null && emp.completedShifts > 0 && (
                <span className="inline-flex items-center gap-1 rounded-badge bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                  <ShieldCheck className="h-3 w-3" />
                  {emp.completedShifts}{' '}
                  {emp.completedShifts % 10 === 1 && emp.completedShifts % 100 !== 11
                    ? 'проведённая смена'
                    : 'проведённых смен'}
                </span>
              )}
              {emp.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {emp.city.name}
                </span>
              )}
              {emp.website && (
                <a
                  href={emp.website.startsWith('http') ? emp.website : `https://${emp.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[var(--accent)] hover:underline"
                >
                  <Globe className="h-3 w-3" />
                  Сайт
                </a>
              )}
            </div>
            {emp.description && (
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-white/65">
                {emp.description}
              </p>
            )}
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Link
            href={`/employers/${emp.slug}`}
            className="flex items-center gap-1.5 rounded-input bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-600"
          >
            Профиль компании
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href={`/vacancies?employer=${emp.id}`}
            className="flex items-center gap-1.5 rounded-input border border-white/15 px-4 py-2 text-sm font-medium text-white/65 transition hover:border-white/30 hover:text-white/85"
          >
            Все вакансии
          </Link>
        </div>
      </section>

      {/* ── Sticky mobile apply bar ── */}
      {!isOwner && !hasApplied && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[var(--u-bg-dark)]/95 p-3 backdrop-blur sm:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">
                {Number(v.rate).toLocaleString('ru-RU')} ₽
              </p>
              <p className="truncate text-[11px] text-white/50">{rateLbl}</p>
            </div>
            {isWorker ? (
              <button
                type="button"
                onClick={handleApply}
                disabled={applyingId === id}
                className="shrink-0 rounded-input bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {applyingId === id ? 'Отправляем…' : 'Откликнуться'}
              </button>
            ) : !isAuthenticated ? (
              <Link
                href={`/auth/register?role=worker&returnTo=${encodeURIComponent(`/vacancies/${v.id}`)}&apply=${v.id}`}
                className="shrink-0 rounded-input bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white"
              >
                Откликнуться
              </Link>
            ) : null}
          </div>
        </div>
      )}

      <ScheduleConflictDialog
        open={pendingConflict !== null}
        message={pendingConflict?.message ?? ''}
        conflicts={pendingConflict?.conflicts ?? []}
        confirming={applyingId !== null}
        onConfirm={async () => {
          const ok = await confirmConflict();
          if (ok) setHasApplied(true);
        }}
        onDismiss={dismissConflict}
        confirmLabel="Всё равно откликнуться"
      />
    </div>
    </div>
  );
}
