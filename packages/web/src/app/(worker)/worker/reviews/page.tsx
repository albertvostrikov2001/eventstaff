'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Star } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { ReviewCard, type WorkerReviewDto } from '@/components/worker/ReviewCard';
import { Button } from '@/components/ui/button';

export default function WorkerReviewsPage() {
  const [reviews, setReviews] = useState<WorkerReviewDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    return apiClient
      .get<{ data: WorkerReviewDto[] }>('/worker/reviews')
      .then((res) => setReviews(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Мои отзывы</h1>
      <p className="mt-1 text-sm text-white/50">Оценки от работодателей после завершённых смен</p>

      <div className="mt-8">
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-input bg-white/10" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 rounded-input border border-white/10 bg-white/[0.04] py-12 text-center">
            <p className="text-sm text-white/60">Не удалось загрузить</p>
            <Button type="button" variant="primary" size="sm" onClick={() => void load()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Повторить
            </Button>
          </div>
        ) : reviews.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-input border border-white/10 bg-white/[0.04] py-16 text-center">
            <Star className="h-10 w-10 text-white/40" />
            <h3 className="font-semibold text-white/90">Отзывов пока нет</h3>
            <p className="max-w-sm text-sm text-white/50">
              Завершите первую смену, чтобы получить оценку от работодателя.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
