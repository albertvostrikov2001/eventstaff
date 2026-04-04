'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { APPLICATION_STATUSES, STAFF_CATEGORIES } from '@unity/shared';
import { Briefcase, Clock, MapPin, Star } from 'lucide-react';

type AppStatus = keyof typeof APPLICATION_STATUSES;

interface Application {
  id: string;
  status: AppStatus;
  createdAt: string;
  vacancy: {
    id: string;
    title: string;
    category: keyof typeof STAFF_CATEGORIES;
    rate: string;
    rateType: string;
    dateStart: string;
    employer: {
      id: string;
      companyName: string | null;
      contactName: string | null;
      isVerified: boolean;
    };
    city: { name: string } | null;
  };
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  viewed: 'bg-blue-50 text-blue-700 border-blue-200',
  invited: 'bg-purple-50 text-purple-700 border-purple-200',
  confirmed: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  cancelled: 'bg-gray-50 text-gray-600 border-gray-200',
};

const TABS = [
  { key: '', label: 'Все' },
  { key: 'pending', label: 'Ожидают' },
  { key: 'confirmed', label: 'Принятые' },
  { key: 'rejected', label: 'Отклонённые' },
  { key: 'invited', label: 'Приглашения' },
];

export default function WorkerApplicationsPage() {
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('');

  useEffect(() => {
    setLoading(true);
    apiClient
      .get<{ data: Application[] }>('/worker/applications', activeTab ? { status: activeTab } : undefined)
      .then((res) => setApplications(res.data))
      .catch(() => toast('Не удалось загрузить отклики', 'error'))
      .finally(() => setLoading(false));
  }, [activeTab, toast]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Мои отклики</h1>
      <p className="mt-1 text-sm text-gray-500">Статусы ваших откликов на вакансии</p>

      <div className="mt-6 flex gap-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
              activeTab === tab.key
                ? 'bg-primary-500 text-white'
                : 'border border-gray-200 bg-white text-gray-600 hover:border-primary-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-card bg-gray-200" />
            ))}
          </div>
        ) : applications.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-card border border-gray-200 bg-white py-16 text-center">
            <Briefcase className="h-10 w-10 text-gray-300" />
            <h3 className="font-semibold text-gray-900">Откликов пока нет</h3>
            <p className="text-sm text-gray-500">Найдите подходящие вакансии и откликнитесь</p>
            <Link
              href="/vacancies"
              className="mt-2 rounded-input bg-primary-500 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-600"
            >
              Найти вакансии
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => (
              <div
                key={app.id}
                className="rounded-card border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{app.vacancy.title}</h3>
                      {app.vacancy.employer.isVerified && (
                        <span className="text-xs text-primary-600">✓</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-gray-500">
                      {app.vacancy.employer.companyName ?? app.vacancy.employer.contactName}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        {STAFF_CATEGORIES[app.vacancy.category] ?? app.vacancy.category}
                      </span>
                      {app.vacancy.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {app.vacancy.city.name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(app.createdAt).toLocaleDateString('ru-RU')}
                      </span>
                      <span className="font-medium text-gray-700">
                        {Number(app.vacancy.rate).toLocaleString('ru-RU')} ₽/ч
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {app.status === 'invited' && (
                      <div className="mb-1 text-xs font-medium text-purple-700">
                        <Star className="inline h-3 w-3" /> Вас пригласили!
                      </div>
                    )}
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[app.status] ?? 'bg-gray-50 text-gray-600'
                      }`}
                    >
                      {APPLICATION_STATUSES[app.status as keyof typeof APPLICATION_STATUSES] ?? app.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
