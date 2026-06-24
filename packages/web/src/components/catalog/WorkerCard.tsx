'use client';

import Link from 'next/link';
import { STAFF_CATEGORIES, RATE_TYPE_SHORT } from '@unity/shared';
import { MapPin, Star, Briefcase, BookOpen, Plane, Heart, MessageSquare, Crown, Zap } from 'lucide-react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { yearsLabel } from '@/lib/utils';

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
  isPremium?: boolean;
  isBoosted?: boolean;
  isRecommended?: boolean;
}

export function WorkerCard({
  id,
  firstName,
  lastName,
  photoUrl,
  categories,
  city,
  desiredRate,
  rateType,
  experienceYears,
  ratingScore,
  hasMedicalBook,
  willingToTravel,
  isAuthenticated,
  isFavorite,
  onFavoriteToggle,
  isPremium = false,
  isBoosted = false,
  isRecommended = false,
}: WorkerCardProps) {
  const mainCategory = categories[0];
  const categoryLabel = mainCategory
    ? STAFF_CATEGORIES[mainCategory.category as keyof typeof STAFF_CATEGORIES] ?? mainCategory.category
    : null;

  return (
    <div
      className={`flex flex-col rounded-card p-5 transition hover:bg-white/[0.06] ${
        isBoosted
          ? 'border-2 border-amber-400/50 bg-amber-400/[0.08] ring-1 ring-amber-300/20'
          : isPremium
          ? 'border-2 border-emerald-400/40 bg-emerald-400/[0.08] ring-1 ring-emerald-300/15'
          : 'border border-white/[0.08] bg-white/[0.04] hover:border-white/[0.16]'
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          <UserAvatar
            src={photoUrl}
            name={`${firstName} ${lastName}`}
            size={64}
            className="h-14 w-14"
          />
          {isBoosted && (
            <span
              title="Буст активен"
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 shadow"
            >
              <Zap className="h-3 w-3 text-white" />
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/workers/${id}`}
              className="block font-semibold text-white/90 transition-colors hover:text-[var(--accent)]"
            >
              {firstName} {lastName}
            </Link>
            {isPremium && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
                <Crown className="h-3 w-3" />
                Premium
              </span>
            )}
            {isRecommended && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">
                <Star className="h-3 w-3" />
                Рекомендован
              </span>
            )}
          </div>
          {categoryLabel && (
            <span className="mt-0.5 inline-block rounded-badge border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300">
              {categoryLabel}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-white/45">
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
          {experienceYears === 0 ? 'Без опыта' : yearsLabel(experienceYears)}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2 text-xs text-white/45">
        {hasMedicalBook && (
          <span className="flex items-center gap-1 text-emerald-300" title="Медкнижка">
            <BookOpen className="h-3 w-3" />
            Медкнижка
          </span>
        )}
        {willingToTravel && (
          <span className="flex items-center gap-1 text-sky-300" title="Готов к выезду">
            <Plane className="h-3 w-3" />
            Выезд
          </span>
        )}
        {isBoosted && (
          <span className="flex items-center gap-1 text-amber-300 font-medium" title="Анкета поднята в топ">
            <Zap className="h-3 w-3" />
            В топе
          </span>
        )}
      </div>

      {desiredRate && (
        <div className="mt-3 text-base font-bold text-white">
          {Number(desiredRate).toLocaleString('ru-RU')} ₽
          {rateType && RATE_TYPE_SHORT[rateType] ? (
            <span className="ml-1 text-xs font-medium text-white/40">{RATE_TYPE_SHORT[rateType]}</span>
          ) : null}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        {isAuthenticated ? (
          <>
            <button
              onClick={() => onFavoriteToggle?.(id)}
              className={`flex items-center gap-1.5 rounded-input border px-3 py-2 text-xs font-medium transition ${
                isFavorite
                  ? 'border-red-500/40 bg-red-500/15 text-red-300 hover:bg-red-500/20'
                  : 'border-white/15 bg-white/[0.04] text-white/60 hover:border-white/30'
              }`}
            >
              <Heart className={`h-3.5 w-3.5 ${isFavorite ? 'fill-current' : ''}`} />
              {isFavorite ? 'В избранном' : 'В избранное'}
            </button>
            <Link
              href={`/employer/messages`}
              className="flex items-center gap-1.5 rounded-input border border-white/15 bg-white/[0.04] px-3 py-2 text-xs font-medium text-white/60 hover:border-white/30"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Написать
            </Link>
          </>
        ) : (
          <Link
            href="/auth/login"
            className="text-xs text-white/50 transition-colors hover:text-[var(--accent)]"
          >
            Войдите, чтобы связаться
          </Link>
        )}
      </div>
    </div>
  );
}
