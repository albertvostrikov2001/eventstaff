'use client';

import Link from 'next/link';
import { Heart, Plane, Zap, BadgeCheck } from 'lucide-react';
import { STAFF_CATEGORIES } from '@unity/shared';
import { cn } from '@/lib/utils';
import { OpenChatButton } from '@/components/chat/OpenChatButton';

export interface EmployerCatalogWorker {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  bio: string | null;
  categories: { category: string }[];
  city: { name: string } | null;
  desiredRate: string | number | null;
  experienceYears: number;
  ratingScore: string | number;
  totalReviews: number;
  isVerified?: boolean;
  readyForTrips?: boolean;
  readyForOvertime?: boolean;
  user?: { id: string };
}

export function EmployerCatalogWorkerCard({
  worker,
  isFavorite,
  favoriteBusy,
  onFavoriteToggle,
  onInvite,
  chatRecipientUserId,
}: {
  worker: EmployerCatalogWorker;
  isFavorite: boolean;
  favoriteBusy?: boolean;
  onFavoriteToggle: () => void;
  onInvite: () => void;
  /** User id работника для /chat/can-chat; если нет — кнопку «Написать» не показываем */
  chatRecipientUserId?: string | null;
}) {
  const displayRate =
    worker.desiredRate != null && `${worker.desiredRate}`.trim() !== ''
      ? Number(worker.desiredRate).toLocaleString('ru-RU')
      : null;

  const catLabels = worker.categories.slice(0, 3).map(
    (c) => STAFF_CATEGORIES[c.category as keyof typeof STAFF_CATEGORIES] ?? c.category,
  );

  const stars = `${Number(worker.ratingScore || 0).toFixed(1)}`;

  return (
    <div className="flex max-w-full flex-col overflow-hidden rounded-[16px] border border-white/[0.08] bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:bg-white/[0.06]">
      <div className="relative flex gap-4 p-4 sm:p-5">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onFavoriteToggle();
          }}
          disabled={favoriteBusy}
          className="absolute right-3 top-3 rounded-full bg-black/35 p-2 text-white/80 ring-1 ring-white/[0.12] backdrop-blur transition hover:bg-black/55 hover:text-rose-200 disabled:opacity-50"
          aria-label={isFavorite ? 'Убрать из избранного' : 'В избранное'}
          aria-pressed={isFavorite}
        >
          <Heart
            className={cn('h-5 w-5', isFavorite ? 'fill-emerald-400 text-emerald-400' : '')}
          />
        </button>

        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/25">
          {worker.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={worker.photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xl font-bold text-emerald-200">
              {(worker.firstName[0] ?? '?').toUpperCase()}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 pt-1 pr-12">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              href={`/workers/${worker.id}`}
              className="truncate text-[17px] font-semibold tracking-tight text-white hover:text-emerald-200"
            >
              {worker.firstName} {worker.lastName}
            </Link>
            {worker.isVerified && (
              <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-400" aria-label="Верифицирован" />
            )}
          </div>
          {catLabels.length > 0 && (
            <p className="mt-1 truncate text-xs text-white/55">{catLabels.join(' • ')}</p>
          )}
          <p className="mt-2 text-xs text-emerald-200/90">
            ★ <span className="font-semibold">{stars}</span>
            <span className="text-white/50">{' · '}</span>
            <span className="text-white/50">
              {worker.totalReviews} {worker.totalReviews === 1 ? 'отзыв' : 'отзывов'}
            </span>
            <span className="text-white/50">{' · '}</span>
            {worker.city?.name ?? 'Город не указан'}
            <span className="text-white/50">{' · '}</span>
            опыт{' '}
            {worker.experienceYears === 0 ? 'нет' : `${worker.experienceYears} ${worker.experienceYears >= 5 ? 'лет' : 'г.'}`}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {worker.readyForTrips ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/15 px-2 py-0.5 text-[11px] text-teal-100 ring-1 ring-teal-400/35">
                <Plane className="h-3 w-3" />
                Выезды
              </span>
            ) : null}
            {worker.readyForOvertime ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/12 px-2 py-0.5 text-[11px] text-amber-100 ring-1 ring-amber-400/30">
                <Zap className="h-3 w-3" />
                Овертайм
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {worker.bio?.trim() && (
        <p className="-mt-2 line-clamp-2 px-4 pb-2 text-[13px] leading-snug text-white/52 sm:px-5">
          {worker.bio.trim()}
        </p>
      )}

      <div className="flex flex-col gap-2 border-t border-white/[0.06] bg-black/15 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4">
        {displayRate !== null ? (
          <div className="text-[15px] font-bold tracking-tight text-white">
            {displayRate}&nbsp;<span className="text-[13px] font-medium text-emerald-200/85">₽/ч</span>
          </div>
        ) : (
          <div className="text-sm text-white/45">Ставка не указана</div>
        )}
        <div className="flex flex-wrap gap-2">
          {chatRecipientUserId ? (
            <OpenChatButton
              recipientUserId={chatRecipientUserId}
              label="Написать"
              className="inline-flex flex-1 min-w-[6rem] items-center justify-center gap-1 rounded-[11px] border border-white/[0.12] bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/90 hover:bg-white/[0.07] disabled:opacity-50 sm:flex-none"
            />
          ) : null}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onInvite();
            }}
            className="inline-flex flex-1 min-w-[7rem] items-center justify-center rounded-[11px] bg-gradient-to-r from-emerald-600 to-teal-500 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-900/30 sm:flex-none"
          >
            Пригласить
          </button>
          <Link
            href={`/workers/${worker.id}`}
            className="inline-flex flex-1 min-w-[6rem] items-center justify-center rounded-[11px] border border-transparent px-3 py-2 text-xs font-semibold text-emerald-300/95 hover:bg-white/[0.04] sm:flex-none"
          >
            Профиль
          </Link>
        </div>
      </div>
    </div>
  );
}
