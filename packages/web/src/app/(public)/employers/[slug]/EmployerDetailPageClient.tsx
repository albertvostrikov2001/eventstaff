'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { BUSINESS_TYPES } from '@unity/shared';
import {
  MapPin, Star, ShieldCheck, Globe,
  Calendar, Users, X,
} from 'lucide-react';
import { EmployerLogoMark } from '@/components/employer/EmployerLogoMark';
import { PhotoLightbox } from '@/components/media/PhotoLightbox';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { config } from '@/lib/config';

const API = config.apiUrl;

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
  bannerUrl?: string | null;
  gallery?: { id: string; url: string }[];
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
  totalShifts?: number;
}

const RATE_SUFFIXES: Record<string, string> = {
  per_shift: '/смена',
  monthly: '/мес',
  hourly: '/ч',
  fixed: ' фикс.',
  daily: '/день',
  weekly: '/нед.',
  after_event: '/мер.',
};

export function EmployerDetailPageClient() {
  const { slug } = useParams<{ slug: string }>();
  const [employer, setEmployer] = useState<EmployerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [bannerOk, setBannerOk] = useState(true);

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

  useEffect(() => {
    setBannerOk(true);
  }, [employer?.bannerUrl]);

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--u-bg-dark)' }}>
        <div className="container-page py-8">
          <div className="h-8 w-48 animate-pulse rounded bg-white/10" />
          <div className="mt-6 h-40 animate-pulse rounded-card bg-white/10" />
        </div>
      </div>
    );
  }

  if (notFound || !employer) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--u-bg-dark)' }}>
        <div className="container-page py-16 text-center">
          <h2 className="text-xl font-semibold text-white/90">Работодатель не найден</h2>
          <Link href="/employers" className="mt-4 inline-block text-sm text-[var(--accent)] hover:underline">
            ← Вернуться к списку
          </Link>
        </div>
      </div>
    );
  }

  const displayName = employer.companyName || employer.contactName || 'Работодатель';
  const businessLabel =
    employer.businessType && employer.businessType in BUSINESS_TYPES
      ? BUSINESS_TYPES[employer.businessType as keyof typeof BUSINESS_TYPES]
      : null;

  const gallery = employer.gallery ?? [];
  const lightboxUrl = lightbox !== null ? gallery[lightbox]?.url : null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--u-bg-dark)' }}>
    <div className="container-page py-8">
      <Breadcrumbs
        items={[
          { label: 'Главная', href: '/' },
          { label: 'Работодатели', href: '/employers' },
          { label: displayName },
        ]}
      />

      <div className="relative mt-6">
        {employer.bannerUrl && bannerOk ? (
          <div className="h-[200px] sm:h-[320px] w-full overflow-hidden rounded-card border border-white/[0.08] bg-white/[0.04]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={employer.bannerUrl}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setBannerOk(false)}
            />
          </div>
        ) : (
          <div
            className="h-[140px] w-full rounded-card border border-white/[0.08] sm:h-[180px]"
            style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))' }}
            aria-hidden
          />
        )}

        <div className="relative z-[1] -mt-12 flex flex-col gap-4 px-2 sm:-mt-14 sm:flex-row sm:items-end sm:gap-6 sm:px-4">
          <PhotoLightbox
            src={employer.logoUrl}
            alt={displayName}
            className="rounded-full"
            disabled={!employer.logoUrl}
          >
            <EmployerLogoMark
              size="xl"
              logoUrl={employer.logoUrl}
              companyName={employer.companyName}
              contactName={employer.contactName}
              alt={displayName}
              className="ring-4 ring-[var(--u-bg-dark)] shadow-md"
            />
          </PhotoLightbox>
          <div className="min-w-0 flex-1 pb-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-white drop-shadow-sm">{displayName}</h1>
              {employer.isVerified && (
                <span className="flex items-center gap-1 rounded-badge bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Верифицирован
                </span>
              )}
            </div>
            {businessLabel && (
              <span className="mt-1 inline-block rounded-badge border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300">
                {businessLabel}
              </span>
            )}
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-white/65">
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
              {employer.totalShifts !== undefined && employer.totalShifts > 0 && (
                <span className="text-white/50">Смен завершено: {employer.totalShifts}</span>
              )}
              {employer.reliabilityScore != null && Number(employer.reliabilityScore) > 0 && (
                <span className="flex items-center gap-1.5 text-emerald-300">
                  <ShieldCheck className="h-4 w-4" />
                  Надёжность {Math.round(Number(employer.reliabilityScore))}%
                </span>
              )}
              {employer.responseRate != null && Number(employer.responseRate) > 0 && (
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  Ответы {Math.round(Number(employer.responseRate))}%
                </span>
              )}
              {employer.website && (
                <a
                  href={employer.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[var(--accent)] hover:underline"
                >
                  <Globe className="h-4 w-4" />
                  Сайт
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-card border border-white/[0.08] bg-white/[0.04] p-6">
        <h2 className="text-lg font-bold text-white">О компании</h2>
        {employer.description ? (
          <p className="mt-3 whitespace-pre-line text-sm text-white/65 leading-relaxed">
            {employer.description}
          </p>
        ) : (
          <p className="mt-3 text-sm text-white/40">Описание скоро появится.</p>
        )}
      </div>

      {gallery.length > 0 ? (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-white">Мероприятия</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {gallery.map((g, idx) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setLightbox(idx)}
                className="aspect-square overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.06] text-left transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {employer.vacancies.length > 0 ? (
        <div className="mt-8" id="active-vacancies">
          <h2 className="text-lg font-bold text-white">
            Активные вакансии ({employer.vacancies.length})
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {employer.vacancies.map((v) => (
              <Link
                key={v.id}
                href={`/vacancies/${v.id}`}
                className="flex flex-col rounded-card border border-white/[0.08] bg-white/[0.04] p-4 transition hover:border-emerald-500/30 hover:bg-white/[0.06]"
              >
                <span className="font-semibold text-white/90">{v.title}</span>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-white/45">
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
                <div className="mt-2 text-base font-bold text-[var(--accent)]">
                  {Number(v.rate).toLocaleString('ru-RU')} ₽{RATE_SUFFIXES[v.rateType] ?? ''}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href={employer.vacancies.length > 0 ? '#active-vacancies' : '/vacancies'}
          className="inline-flex rounded-input bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
        >
          Откликнуться на вакансии
        </Link>
      </div>

      {lightboxUrl ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Просмотр фото"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 z-[102] rounded-full bg-white/15 p-2 text-white backdrop-blur-sm hover:bg-white/25 sm:right-6 sm:top-6"
            aria-label="Закрыть"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox(null);
            }}
          >
            <X className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt=""
            className="max-h-[85vh] max-w-full object-contain relative z-[1]"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
    </div>
  );
}
