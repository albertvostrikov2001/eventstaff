'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { STAFF_CATEGORIES, RATE_TYPES, EMPLOYMENT_TYPES } from '@unity/shared';
import { MapPin, Calendar, ShieldCheck, ArrowLeft } from 'lucide-react';
import { formatDateTimeRu } from '@/lib/dates/formatDateTime';
import { EmployerLogoMark } from '@/components/employer/EmployerLogoMark';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

interface VacancyPublic {
  id: string;
  title: string;
  category: string;
  employmentType: string;
  rate: string | number;
  rateType: string;
  dateStart: string;
  description: string | null;
  status: string;
  employer: {
    id: string;
    slug: string;
    companyName: string | null;
    contactName: string | null;
    logoUrl: string | null;
    isVerified: boolean;
  };
  city: { name: string } | null;
}

export function VacancyPublicDetailPageClient() {
  const params = useParams();
  const id = String(params?.id ?? '');
  const [v, setV] = useState<VacancyPublic | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="container-page py-10">
        <div className="h-10 w-full max-w-lg animate-pulse rounded bg-gray-200" />
      </div>
    );
  }

  if (!v || v.status !== 'active') {
    return (
      <div className="container-page py-16 text-center">
        <p className="text-lg font-medium text-gray-900">Вакансия не найдена</p>
        <Link href="/vacancies" className="mt-4 inline-block text-sm text-primary-600 hover:underline">
          ← К каталогу
        </Link>
      </div>
    );
  }

  const emp = v.employer;
  const name = emp.companyName ?? emp.contactName ?? 'Работодатель';
  const catLabel = STAFF_CATEGORIES[v.category as keyof typeof STAFF_CATEGORIES] ?? v.category;
  const rateLbl = RATE_TYPES[v.rateType as keyof typeof RATE_TYPES] ?? v.rateType;
  const emplLbl =
    EMPLOYMENT_TYPES[v.employmentType as keyof typeof EMPLOYMENT_TYPES] ?? v.employmentType;

  return (
    <div className="container-page py-8">
      <Link href="/vacancies" className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600">
        <ArrowLeft className="h-4 w-4" />
        Все вакансии
      </Link>

      <article className="rounded-card border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            <EmployerLogoMark
              logoUrl={emp.logoUrl}
              companyName={emp.companyName}
              contactName={emp.contactName}
              size="lg"
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{v.title}</h1>
              <Link
                href={`/employers/${emp.slug}`}
                className="mt-1 inline-flex items-center gap-1 text-sm text-primary-600 hover:underline"
              >
                {name}
                {emp.isVerified && (
                  <span title="Верифицирован" className="inline-flex">
                    <ShieldCheck className="h-4 w-4 text-primary-500" />
                  </span>
                )}
              </Link>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                <span className="rounded-badge bg-primary-50 px-2 py-0.5 font-medium text-primary-700">{catLabel}</span>
                <span>{emplLbl}</span>
                {v.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {v.city.name}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDateTimeRu(v.dateStart, 'date')}
                </span>
              </div>
            </div>
          </div>
          <div className="rounded-input bg-gray-50 px-4 py-3 text-right">
            <div className="text-2xl font-bold text-gray-900">{Number(v.rate).toLocaleString('ru-RU')} ₽</div>
            <div className="text-xs text-gray-500">{rateLbl}</div>
          </div>
        </div>

        {v.description ? (
          <div className="mt-6 border-t border-gray-100 pt-6">
            <h2 className="text-sm font-semibold text-gray-800">Описание</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-gray-600 leading-relaxed">{v.description}</p>
          </div>
        ) : null}
      </article>
    </div>
  );
}
