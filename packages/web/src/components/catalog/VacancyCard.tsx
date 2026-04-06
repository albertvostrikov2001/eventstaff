'use client';

import Link from 'next/link';
import { STAFF_CATEGORIES, EVENT_TYPES } from '@unity/shared';
import { MapPin, Calendar, ShieldCheck, Heart } from 'lucide-react';

interface VacancyCardProps {
  id: string;
  title: string;
  employer: {
    id: string;
    companyName: string | null;
    contactName: string | null;
    isVerified: boolean;
  };
  category: string;
  city: { name: string } | null;
  rate: string | number;
  rateType: string;
  eventType: string | null;
  dateStart: string;
  isAuthenticated?: boolean;
  isFavorite?: boolean;
  userRole?: string;
  onFavoriteToggle?: (id: string) => void;
  onApply?: (id: string) => void;
}

export function VacancyCard({
  id,
  title,
  employer,
  category,
  city,
  rate,
  eventType,
  dateStart,
  isAuthenticated,
  isFavorite,
  userRole,
  onFavoriteToggle,
  onApply,
}: VacancyCardProps) {
  const categoryLabel = STAFF_CATEGORIES[category as keyof typeof STAFF_CATEGORIES] ?? category;
  const eventLabel = eventType
    ? EVENT_TYPES[eventType as keyof typeof EVENT_TYPES] ?? eventType
    : null;
  const employerName = employer.companyName ?? employer.contactName ?? 'Работодатель';

  return (
    <div className="flex flex-col rounded-card border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <Link
            href={`/vacancies/${id}`}
            className="block font-semibold text-gray-900 hover:text-primary-600"
          >
            {title}
          </Link>
          <div className="mt-0.5 flex items-center gap-1 text-sm text-gray-500">
            <span>{employerName}</span>
            {employer.isVerified && (
              <span title="Верифицирован" className="inline-flex">
                <ShieldCheck className="h-3.5 w-3.5 text-primary-500" aria-hidden />
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-gray-900">
            {Number(rate).toLocaleString('ru-RU')} ₽
          </div>
          <div className="text-xs text-gray-400">в час</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-badge bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
          {categoryLabel}
        </span>
        {eventLabel && (
          <span className="rounded-badge bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {eventLabel}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
        {city && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {city.name}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {new Date(dateStart).toLocaleDateString('ru-RU')}
        </span>
      </div>

      <div className="mt-4 flex gap-2">
        {isAuthenticated ? (
          <>
            {userRole === 'worker' && onApply && (
              <button
                onClick={() => onApply(id)}
                className="rounded-input bg-primary-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-600"
              >
                Откликнуться
              </button>
            )}
            {onFavoriteToggle && (
              <button
                onClick={() => onFavoriteToggle(id)}
                className={`flex items-center gap-1.5 rounded-input border px-3 py-1.5 text-xs font-medium transition ${
                  isFavorite
                    ? 'border-red-200 bg-red-50 text-error'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <Heart className={`h-3.5 w-3.5 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
            )}
          </>
        ) : (
          <Link href="/auth/login" className="text-xs text-gray-500 hover:text-primary-600">
            Войдите, чтобы откликнуться
          </Link>
        )}
      </div>
    </div>
  );
}
