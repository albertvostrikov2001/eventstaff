'use client';

import Link from 'next/link';
import { STAFF_CATEGORIES, EVENT_TYPES, RATE_TYPE_SHORT } from '@unity/shared';
import { MapPin, Calendar, ShieldCheck, Heart } from 'lucide-react';
import { formatDateTimeRu } from '@/lib/dates/formatDateTime';
import { EmployerLogoMark } from '@/components/employer/EmployerLogoMark';

interface VacancyCardProps {
  id: string;
  title: string;
  employer: {
    id: string;
    companyName: string | null;
    contactName: string | null;
    isVerified: boolean;
    logoUrl?: string | null;
  };
  category: string;
  city: { name: string } | null;
  address?: string | null;
  rate: string | number;
  rateType: string;
  eventType: string | null;
  dateStart: string;
  isUrgent?: boolean;
  isAuthenticated?: boolean;
  isFavorite?: boolean;
  hasApplied?: boolean;
  isApplying?: boolean;
  isFavoriteLoading?: boolean;
  userRole?: string;
  isHighlighted?: boolean;
  onFavoriteToggle?: (id: string) => void;
  onApply?: (id: string) => void;
}

export function VacancyCard({
  id,
  title,
  employer,
  category,
  city,
  address,
  rate,
  rateType,
  eventType,
  dateStart,
  isUrgent = false,
  isAuthenticated,
  isFavorite,
  hasApplied,
  isApplying,
  isFavoriteLoading,
  userRole,
  isHighlighted = false,
  onFavoriteToggle,
  onApply,
}: VacancyCardProps) {
  const categoryLabel = STAFF_CATEGORIES[category as keyof typeof STAFF_CATEGORIES] ?? category;
  const eventLabel = eventType
    ? EVENT_TYPES[eventType as keyof typeof EVENT_TYPES] ?? eventType
    : null;
  const employerName = employer.companyName ?? employer.contactName ?? 'Работодатель';

  return (
    <div
      className={`flex flex-col rounded-card p-5 transition ${
        isHighlighted
          ? 'border-2 border-amber-400/50 bg-amber-400/[0.08] ring-1 ring-amber-300/20 hover:bg-amber-400/[0.12]'
          : 'border border-white/[0.08] bg-white/[0.04] hover:border-white/[0.16] hover:bg-white/[0.06]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <EmployerLogoMark
          size="md"
          logoUrl={employer.logoUrl ?? null}
          companyName={employer.companyName}
          contactName={employer.contactName}
          className="-mt-0.5"
        />
        <div className="flex-1">
          <Link
            href={`/vacancies/${id}`}
            className="block font-semibold text-white/90 transition-colors hover:text-[var(--accent)]"
          >
            {title}
          </Link>
          <div className="mt-0.5 flex items-center gap-1 text-sm text-white/50">
            <span>{employerName}</span>
            {employer.isVerified && (
              <span title="Верифицирован" className="inline-flex">
                <ShieldCheck className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden />
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-base font-bold text-white sm:text-lg">
            {Number(rate).toLocaleString('ru-RU')} ₽
          </div>
          <div className="text-xs text-white/40">{RATE_TYPE_SHORT[rateType] ?? ''}</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {isUrgent && (
          <span className="rounded-badge border border-red-500/30 bg-red-500/15 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-red-300">
            Срочно
          </span>
        )}
        <span className="rounded-badge border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300">
          {categoryLabel}
        </span>
        {eventLabel && (
          <span className="rounded-badge bg-white/[0.06] px-2 py-0.5 text-xs text-white/60">
            {eventLabel}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-white/45">
        {city && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {city.name}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {formatDateTimeRu(dateStart, 'date')}
        </span>
        {address && address.trim() && (
          <span className="flex w-full items-center gap-1 text-white/40">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{address}</span>
          </span>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        {isAuthenticated ? (
          <>
            {userRole === 'worker' && onApply && (
              hasApplied ? (
                <span className="inline-flex items-center rounded-badge bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
                  Отклик отправлен
                </span>
              ) : (
                <button
                  type="button"
                  disabled={isApplying}
                  onClick={() => onApply(id)}
                  className="rounded-input bg-primary-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isApplying ? 'Отправка…' : 'Откликнуться'}
                </button>
              )
            )}
            {onFavoriteToggle && (
              <button
                type="button"
                disabled={isFavoriteLoading}
                onClick={() => onFavoriteToggle(id)}
                aria-label={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
                className={`flex items-center gap-1.5 rounded-input border px-3 py-2 text-xs font-medium transition disabled:opacity-60 ${
                  isFavorite
                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                    : 'border-white/15 bg-white/[0.04] text-white/60 hover:border-white/30'
                }`}
              >
                <Heart
                  className={`h-3.5 w-3.5 ${isFavorite ? 'fill-current text-emerald-300' : ''}`}
                />
              </button>
            )}
          </>
        ) : (
          <Link
            href={`/auth/register?role=worker&returnTo=${encodeURIComponent(`/vacancies/${id}`)}&apply=${id}`}
            className="rounded-input bg-primary-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-primary-600"
          >
            Откликнуться
          </Link>
        )}
      </div>
    </div>
  );
}
