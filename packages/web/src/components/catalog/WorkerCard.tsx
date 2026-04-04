'use client';

import Link from 'next/link';
import { STAFF_CATEGORIES } from '@unity/shared';
import { MapPin, Star, Briefcase, BookOpen, Plane, Heart, MessageSquare } from 'lucide-react';

interface WorkerCardProps {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  categories: { category: string; level: string }[];
  city: { name: string } | null;
  desiredRate: string | null;
  rateType: string | null;
  experienceYears: number;
  ratingScore: string | number;
  hasMedicalBook: boolean;
  willingToTravel: boolean;
  isAuthenticated?: boolean;
  isFavorite?: boolean;
  onFavoriteToggle?: (id: string) => void;
}

export function WorkerCard({
  id,
  firstName,
  lastName,
  categories,
  city,
  desiredRate,
  experienceYears,
  ratingScore,
  hasMedicalBook,
  willingToTravel,
  isAuthenticated,
  isFavorite,
  onFavoriteToggle,
}: WorkerCardProps) {
  const mainCategory = categories[0];
  const categoryLabel = mainCategory
    ? STAFF_CATEGORIES[mainCategory.category as keyof typeof STAFF_CATEGORIES] ?? mainCategory.category
    : null;

  return (
    <div className="flex flex-col rounded-card border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-card-hover">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-100">
          <span className="text-xl font-bold text-primary-600">
            {firstName[0]?.toUpperCase() ?? '?'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <Link
            href={`/workers/${id}`}
            className="block font-semibold text-gray-900 hover:text-primary-600"
          >
            {firstName} {lastName}
          </Link>
          {categoryLabel && (
            <span className="mt-0.5 inline-block rounded-badge bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
              {categoryLabel}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500">
        {city && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {city.name}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          {Number(ratingScore).toFixed(1)}
        </span>
        <span className="flex items-center gap-1">
          <Briefcase className="h-3 w-3" />
          {experienceYears === 0 ? 'Без опыта' : `${experienceYears} лет`}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
        {hasMedicalBook && (
          <span className="flex items-center gap-1 text-green-600" title="Медкнижка">
            <BookOpen className="h-3 w-3" />
            Медкнижка
          </span>
        )}
        {willingToTravel && (
          <span className="flex items-center gap-1 text-blue-600" title="Готов к выезду">
            <Plane className="h-3 w-3" />
            Выезд
          </span>
        )}
      </div>

      {desiredRate && (
        <div className="mt-3 text-base font-bold text-gray-900">
          {Number(desiredRate).toLocaleString('ru-RU')} ₽/ч
        </div>
      )}

      <div className="mt-4 flex gap-2">
        {isAuthenticated ? (
          <>
            <button
              onClick={() => onFavoriteToggle?.(id)}
              className={`flex items-center gap-1.5 rounded-input border px-3 py-1.5 text-xs font-medium transition ${
                isFavorite
                  ? 'border-red-200 bg-red-50 text-error hover:bg-red-100'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <Heart className={`h-3.5 w-3.5 ${isFavorite ? 'fill-current' : ''}`} />
              {isFavorite ? 'В избранном' : 'В избранное'}
            </button>
            <Link
              href={`/employer/messages`}
              className="flex items-center gap-1.5 rounded-input border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-gray-300"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Написать
            </Link>
          </>
        ) : (
          <Link
            href="/auth/login"
            className="text-xs text-gray-500 hover:text-primary-600"
          >
            Войдите, чтобы связаться
          </Link>
        )}
      </div>
    </div>
  );
}
