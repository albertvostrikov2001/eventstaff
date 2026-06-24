'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { WorkerCard } from '@/components/catalog/WorkerCard';
import { WorkerCardSkeleton } from '@/components/catalog/WorkerCardSkeleton';
import { config } from '@/lib/config';

interface WorkerProfile {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  categories: { category: string; level: string }[];
  city: { id: string; name: string } | null;
  desiredRate: string | null;
  rateType: string | null;
  experienceYears: number;
  ratingScore: string;
  hasMedicalBook: boolean;
  willingToTravel: boolean;
  isPremium?: boolean;
  isBoosted?: boolean;
  isRecommended?: boolean;
}

/**
 * Живая сетка специалистов выбранной категории — реальный, обновляемый
 * контент на посадочной странице (важно для индексации и для пользователя).
 */
export function CategoryWorkersGrid({ category, plural }: { category: string; plural: string }) {
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${config.apiUrl}/catalog/workers?category=${encodeURIComponent(category)}&limit=6`, {
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((j) => {
        setWorkers(j.data ?? []);
        setTotal(j.meta?.total ?? (j.data?.length ?? 0));
      })
      .catch(() => {
        setWorkers([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [category]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <WorkerCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (workers.length === 0) {
    return (
      <div className="rounded-card border border-white/[0.08] bg-white/[0.04] p-8 text-center">
        <p className="text-white/70">
          Сейчас в этой категории нет открытых анкет. Оставьте заявку — мы подберём специалистов под ваше мероприятие.
        </p>
        <Link
          href="/request"
          className="mt-4 inline-flex items-center gap-1.5 rounded-input bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600"
        >
          Оставить заявку <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {workers.map((w) => (
          <WorkerCard key={w.id} {...w} isAuthenticated={false} />
        ))}
      </div>
      <div className="mt-6 text-center">
        <Link
          href={`/workers?category=${encodeURIComponent(category)}`}
          className="inline-flex items-center gap-1.5 rounded-input border border-white/15 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/[0.08]"
        >
          {total > workers.length ? `Все ${plural.toLowerCase()} (${total})` : `Смотреть всех: ${plural.toLowerCase()}`}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </>
  );
}
