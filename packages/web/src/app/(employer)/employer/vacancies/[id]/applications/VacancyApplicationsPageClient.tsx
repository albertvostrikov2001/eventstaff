'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiClient, ApiError } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { APPLICATION_STATUSES, STAFF_CATEGORIES } from '@unity/shared';
import { ArrowLeft, MapPin, Check, X, User } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { OpenChatButton } from '@/components/chat/OpenChatButton';

interface Application {
  id: string;
  status: string;
  createdAt: string;
  coverMessage: string | null;
  worker: {
    id: string;
    firstName: string;
    lastName: string;
    photoUrl: string | null;
    desiredRate: string | null;
    experienceYears: number;
    city: { name: string } | null;
    categories: { category: string; level: string }[];
    user: { id: string; email?: string };
  };
}

export function VacancyApplicationsPageClient() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [vacancyTitle, setVacancyTitle] = useState('Вакансия');
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  const CHAT_READY = new Set(['confirmed', 'shift_started', 'completed', 'invited']);

  const loadApplications = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setLoadError(false);
    apiClient
      .get<{ data: Application[] }>(`/employer/vacancies/${id}/applications`)
      .then((res) => {
        setApplications(res.data);
      })
      .catch(() => {
        setLoadError(true);
        toast('Ошибка загрузки откликов', 'error');
      })
      .finally(() => setLoading(false));
  }, [id, toast]);

  useEffect(() => {
    loadApplications();

    apiClient
      .get<{ data: { title: string } }>(`/employer/vacancies/${id}`)
      .then((res) => setVacancyTitle(res.data.title))
      .catch(() => {});
  }, [id, toast, loadApplications]);

  const updateStatus = async (appId: string, status: 'confirmed' | 'rejected') => {
    setStatusUpdatingId(appId);
    try {
      await apiClient.patch(`/employer/applications/${appId}/status`, { status });
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status } : a)),
      );
      toast(
        status === 'confirmed'
          ? 'Отклик принят. Теперь вы можете начать общение.'
          : 'Отклик отклонён',
        'success',
      );
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Ошибка обновления статуса', 'error');
    } finally {
      setStatusUpdatingId(null);
    }
  };

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Мои вакансии', href: '/employer/vacancies' },
          {
            label: loading && vacancyTitle === 'Вакансия' ? '…' : vacancyTitle,
            href: loading && vacancyTitle === 'Вакансия' ? undefined : `/employer/vacancies/${id}`,
          },
          { label: 'Отклики' },
        ]}
      />
      <div className="mb-6 flex items-center gap-3">
        <Link href="/employer/vacancies" className="rounded-full p-1.5 hover:bg-white/10">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Отклики на вакансию</h1>
          <p className="mt-0.5 text-sm text-white/50">{applications.length} откликов</p>
        </div>
      </div>

      {loadError ? (
        <div className="rounded-card border border-white/10 bg-white/[0.04] py-12 text-center">
          <p className="text-sm text-white/60">Не удалось загрузить отклики</p>
          <Button type="button" variant="primary" size="sm" className="mt-4" onClick={loadApplications}>
            Повторить
          </Button>
        </div>
      ) : loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-card bg-white/10" />
          ))}
        </div>
      ) : applications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card border border-white/10 bg-white/[0.04] py-16 text-center">
          <User className="h-10 w-10 text-white/40" />
          <h3 className="font-semibold text-white/90">Откликов пока нет</h3>
          <p className="text-sm text-white/50">Когда кандидаты откликнутся — они появятся здесь</p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <div key={app.id} className="rounded-card border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100">
                  <User className="h-6 w-6 text-gray-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <Link
                        href={`/workers/${app.worker.id}`}
                        className="font-semibold text-gray-900 hover:text-primary-600"
                      >
                        {app.worker.firstName} {app.worker.lastName}
                      </Link>
                      <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-gray-500">
                        {app.worker.categories[0] && (
                          <span>
                            {STAFF_CATEGORIES[app.worker.categories[0].category as keyof typeof STAFF_CATEGORIES] ?? app.worker.categories[0].category}
                          </span>
                        )}
                        {app.worker.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />{app.worker.city.name}
                          </span>
                        )}
                        {app.worker.desiredRate && (
                          <span className="font-medium text-gray-700">
                            {Number(app.worker.desiredRate).toLocaleString('ru-RU')} ₽/ч
                          </span>
                        )}
                        <span>{app.worker.experienceYears} лет опыта</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        app.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        app.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                        app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {APPLICATION_STATUSES[app.status as keyof typeof APPLICATION_STATUSES] ?? app.status}
                      </span>
                    </div>
                  </div>
                  {app.coverMessage && (
                    <p className="mt-2 text-sm text-gray-600">{app.coverMessage}</p>
                  )}
                  {['pending', 'viewed', 'invited', 'interview'].includes(app.status) && (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={statusUpdatingId === app.id}
                        onClick={() => void updateStatus(app.id, 'confirmed')}
                        leftIcon={<Check className="h-3 w-3" />}
                        className="flex-1 rounded-input bg-green-600 hover:bg-green-700"
                      >
                        Принять
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void updateStatus(app.id, 'rejected')}
                        leftIcon={<X className="h-3 w-3" />}
                        className="flex-1 rounded-input border-red-200 text-red-600 hover:bg-red-50"
                      >
                        Отклонить
                      </Button>
                    </div>
                  )}
                  {CHAT_READY.has(app.status) ? (
                    <div className="mt-3">
                      <OpenChatButton
                        recipientUserId={app.worker.user.id}
                        context={{ type: 'APPLICATION', id: app.id }}
                        forceVisible
                        label="Написать"
                        className="flex w-fit items-center gap-1.5 rounded-input border border-emerald-500/35 bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-60"
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
