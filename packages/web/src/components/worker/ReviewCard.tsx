'use client';

import { useState } from 'react';
import { ChevronDown, Star } from 'lucide-react';
import { EmployerLogoMark } from '@/components/employer/EmployerLogoMark';
import { formatDateTimeRu } from '@/lib/dates/formatDateTime';

export interface WorkerReviewDto {
  id: string;
  punctuality: number;
  jobMatch: number;
  communication: number;
  workQuality: number;
  termsCompliance: number;
  overallScore: number;
  comment: string | null;
  createdAt: string;
  reviewer: {
    id: string;
    employerProfile: {
      companyName: string | null;
      contactName: string | null;
      logoUrl: string | null;
    } | null;
  };
  shift: {
    createdAt: string;
    booking: { date: string; linkedVacancy: { title: string } | null };
  };
}

const CRITERIA: { key: keyof Pick<WorkerReviewDto, 'punctuality' | 'jobMatch' | 'communication' | 'workQuality' | 'termsCompliance'>; label: string }[] = [
  { key: 'punctuality', label: 'Пунктуальность' },
  { key: 'jobMatch', label: 'Соответствие задаче' },
  { key: 'communication', label: 'Коммуникация' },
  { key: 'workQuality', label: 'Качество работы' },
  { key: 'termsCompliance', label: 'Соблюдение условий' },
];

function Stars({ score }: { score: number }) {
  const rounded = Math.round(score);
  return (
    <span className="inline-flex gap-0.5" aria-label={`Оценка ${score.toFixed(1)}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i <= rounded ? 'fill-amber-400 text-amber-400' : 'text-white/20'}`}
        />
      ))}
    </span>
  );
}

export function ReviewCard({ review }: { review: WorkerReviewDto }) {
  const [open, setOpen] = useState(false);
  const ep = review.reviewer.employerProfile;
  const employerName = ep?.companyName ?? ep?.contactName ?? 'Работодатель';

  return (
    <article className="rounded-input border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-start gap-3">
        <EmployerLogoMark
          size="md"
          logoUrl={ep?.logoUrl ?? null}
          companyName={ep?.companyName}
          contactName={ep?.contactName}
        />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-white/90">{employerName}</div>
          <div className="mt-0.5 text-sm text-white/55">
            {(review.shift.booking.linkedVacancy?.title ?? 'Смена')} ·{' '}
            {formatDateTimeRu(review.shift.booking.date, 'date')}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Stars score={review.overallScore} />
            <span className="text-sm font-medium text-white/70">{review.overallScore.toFixed(1)}</span>
          </div>
        </div>
        <time className="shrink-0 text-xs text-white/40">{formatDateTimeRu(review.createdAt, 'date')}</time>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-4 flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/65 hover:bg-white/[0.06]"
      >
        Критерии оценки
        <ChevronDown className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? (
        <ul className="mt-2 space-y-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm">
          {CRITERIA.map(({ key, label }) => (
            <li key={key} className="flex justify-between text-white/70">
              <span>{label}</span>
              <span className="font-medium text-white/90">{review[key]} / 5</span>
            </li>
          ))}
        </ul>
      ) : null}

      {review.comment ? (
        <p className="mt-3 text-sm leading-relaxed text-white/65">{review.comment}</p>
      ) : null}
    </article>
  );
}
