'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { APPLICATION_STATUSES, STAFF_CATEGORIES } from '@unity/shared';
import { ArrowLeft, MapPin, Check, X, User } from 'lucide-react';

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
  };
}

export function VacancyApplicationsPageClient() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<{ data: Application[] }>(`/employer/vacancies/${id}/applications`)
      .then((res) => setApplications(res.data))
      .catch(() => toast('Ошибка загрузки откликов', 'error'))
      .finally(() => setLoading(false));
  }, [id, toast]);

  const updateStatus = async (appId: string, status: 'confirmed' | 'rejected') => {
    try {
      await apiClient.patch(`/employer/applications/${appId}/status`, { status });
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status } : a)),
      );
      toast(status === 'confirmed' ? 'Отклик принят' : 'Отклик отклонён', 'success');
    } catch {
      toast('Ошибка обновления статуса', 'error');
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/employer/vacancies" className="rounded-full p-1.5 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Отклики на вакансию</h1>
          <p className="mt-0.5 text-sm text-gray-500">{applications.length} откликов</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-card bg-gray-200" />
          ))}
        </div>
      ) : applications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card border border-gray-200 bg-white py-16 text-center">
          <User className="h-10 w-10 text-gray-300" />
          <h3 className="font-semibold text-gray-900">Откликов пока нет</h3>
          <p className="text-sm text-gray-500">Когда кандидаты откликнутся — они появятся здесь</p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <div key={app.id} className="rounded-card border border-gray-200 bg-white p-5 shadow-sm">
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
                  {app.status === 'pending' && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => updateStatus(app.id, 'confirmed')}
                        className="flex items-center gap-1 rounded-input bg-green-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600"
                      >
                        <Check className="h-3 w-3" />
                        Принять
                      </button>
                      <button
                        onClick={() => updateStatus(app.id, 'rejected')}
                        className="flex items-center gap-1 rounded-input border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        <X className="h-3 w-3" />
                        Отклонить
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
