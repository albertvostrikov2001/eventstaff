'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { BUSINESS_TYPES } from '@unity/shared';
import {
  MapPin, Star, ShieldCheck, Globe, Phone, Mail,
  Briefcase, ArrowLeft, Calendar, Users,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

interface Vacancy {
  id: string;
  title: string;
  category: string;
  rate: number;
  rateType: string;
  dateStart: string;
  city: { name: string } | null;
}

interface EmployerDetail {
  id: string;
  slug: string;
  companyName: string | null;
  contactName: string | null;
  logoUrl: string | null;
  description: string | null;
  businessType: string | null;
  website: string | null;
  inn: string | null;
  city: { name: string } | null;
  ratingScore: string;
  isVerified: boolean;
  verifiedAt: string | null;
  reliabilityScore: string | null;
  responseRate: string | null;
  vacancies: Vacancy[];
}

const RATE_SUFFIXES: Record<string, string> = {
  hourly: '/ч',
  per_shift: '/смена',
  fixed: ' фикс.',
  daily: '/день',
  weekly: '/нед.',
  after_event: '/мер.',
};

export default function EmployerDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [employer, setEmployer] = useState<EmployerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`${API}/catalog/employers/${slug}`, { credentials: 'include' })
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((j) => { if (j) setEmployer(j.data); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="container-page py-8">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="mt-6 h-40 animate-pulse rounded-card bg-gray-200" />
      </div>
    );
  }

  if (notFound || !employer) {
    return (
      <div className="container-page py-16 text-center">
        <h2 className="text-xl font-semibold text-gray-900">Работодатель не найден</h2>
        <Link href="/employers" className="mt-4 inline-block text-sm text-primary-600 hover:underline">
          ← Вернуться к списку
        </Link>
      </div>
    );
  }

  const displayName = employer.companyName || employer.contactName || 'Работодатель';
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  const businessLabel =
    employer.businessType && employer.businessType in BUSINESS_TYPES
      ? BUSINESS_TYPES[employer.businessType as keyof typeof BUSINESS_TYPES]
      : null;

  return (
    <div className="container-page py-8">
      <Link href="/employers" className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600">
        <ArrowLeft className="h-4 w-4" />
        Назад к работодателям
      </Link>

      <div className="mt-6 rounded-card border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-primary-100">
            {employer.logoUrl ? (
              <img src={employer.logoUrl} alt={displayName} className="h-20 w-20 rounded-xl object-cover" />
            ) : (
              <span className="text-2xl font-bold text-primary-600">{initials}</span>
            )}
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
              {employer.isVerified && (
                <span className="flex items-center gap-1 rounded-badge bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Верифицирован
                </span>
              )}
            </div>

            {businessLabel && (
              <span className="mt-1 inline-block rounded-badge bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
                {businessLabel}
              </span>
            )}

            <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500">
              {employer.city && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {employer.city.name}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                {Number(employer.ratingScore).toFixed(1)}
              </span>
              {employer.reliabilityScore && (
                <span className="flex items-center gap-1.5 text-green-600">
                  <ShieldCheck className="h-4 w-4" />
                  Надёжность {employer.reliabilityScore}%
                </span>
              )}
              {employer.responseRate && (
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  Ответы {employer.responseRate}%
                </span>
              )}
              {employer.website && (
                <a
                  href={employer.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-primary-600 hover:underline"
                >
                  <Globe className="h-4 w-4" />
                  Сайт
                </a>
              )}
            </div>
          </div>
        </div>

        {employer.description && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-gray-700">О компании</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-gray-600 leading-relaxed">
              {employer.description}
            </p>
          </div>
        )}
      </div>

      {employer.vacancies.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-bold text-gray-900">
            Активные вакансии ({employer.vacancies.length})
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {employer.vacancies.map((v) => (
              <Link
                key={v.id}
                href={`/vacancies/${v.id}`}
                className="flex flex-col rounded-card border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-card-hover hover:border-primary-200"
              >
                <span className="font-semibold text-gray-900">{v.title}</span>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                  {v.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {v.city.name}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(v.dateStart).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <div className="mt-2 text-base font-bold text-primary-600">
                  {Number(v.rate).toLocaleString('ru-RU')} ₽{RATE_SUFFIXES[v.rateType] ?? ''}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
