'use client';

import Link from 'next/link';
import { BUSINESS_TYPES } from '@unity/shared';
import { MapPin, Star, Briefcase, ShieldCheck, Globe } from 'lucide-react';

interface EmployerCardProps {
  id: string;
  slug: string;
  companyName: string | null;
  contactName: string | null;
  logoUrl: string | null;
  description: string | null;
  businessType: string | null;
  city: { name: string } | null;
  ratingScore: string | number;
  isVerified: boolean;
  reliabilityScore: string | number | null;
  responseRate: string | number | null;
  _count: { vacancies: number };
}

export function EmployerCard({
  id,
  slug,
  companyName,
  contactName,
  logoUrl,
  description,
  businessType,
  city,
  ratingScore,
  isVerified,
  reliabilityScore,
  responseRate,
  _count,
}: EmployerCardProps) {
  const displayName = companyName || contactName || 'Работодатель';
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  const businessLabel =
    businessType && businessType in BUSINESS_TYPES
      ? BUSINESS_TYPES[businessType as keyof typeof BUSINESS_TYPES]
      : null;

  return (
    <div className="flex flex-col rounded-card border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-card-hover">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary-100">
          {logoUrl ? (
            <img src={logoUrl} alt={displayName} className="h-14 w-14 rounded-xl object-cover" />
          ) : (
            <span className="text-lg font-bold text-primary-600">{initials}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Link
              href={`/employers/${slug}`}
              className="block font-semibold text-gray-900 hover:text-primary-600 truncate"
            >
              {displayName}
            </Link>
            {isVerified && (
              <span title="Верифицирован" className="inline-flex shrink-0">
                <ShieldCheck className="h-4 w-4 text-primary-500" aria-hidden />
              </span>
            )}
          </div>
          {businessLabel && (
            <span className="mt-0.5 inline-block rounded-badge bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
              {businessLabel}
            </span>
          )}
        </div>
      </div>

      {description && (
        <p className="mt-3 line-clamp-2 text-xs text-gray-500 leading-relaxed">{description}</p>
      )}

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
          {_count.vacancies} {getVacancyWord(_count.vacancies)}
        </span>
        {reliabilityScore && (
          <span className="flex items-center gap-1 text-green-600">
            <ShieldCheck className="h-3 w-3" />
            Надёжность {reliabilityScore}%
          </span>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <Link
          href={`/employers/${slug}`}
          className="flex-1 rounded-input bg-primary-500 py-1.5 text-center text-xs font-semibold text-white transition hover:bg-primary-600"
        >
          Открыть профиль
        </Link>
        {_count.vacancies > 0 && (
          <Link
            href={`/vacancies?employer=${id}`}
            className="flex items-center gap-1 rounded-input border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-gray-300"
          >
            <Globe className="h-3.5 w-3.5" />
            Вакансии
          </Link>
        )}
      </div>
    </div>
  );
}

function getVacancyWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'вакансий';
  if (mod10 === 1) return 'вакансия';
  if (mod10 >= 2 && mod10 <= 4) return 'вакансии';
  return 'вакансий';
}
