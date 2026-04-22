'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/lib/api/client';
import { Send, Star, Eye, EyeOff, Briefcase, Inbox } from 'lucide-react';
import { APPLICATION_STATUSES } from '@unity/shared';

interface Application {
  id: string;
  status: string;
  createdAt: string;
  vacancy: {
    title: string;
    employer: { companyName: string | null; contactName: string | null };
  };
}

interface Stats {
  total: number;
  confirmed: number;
  pending: number;
}

export default function WorkerDashboardPage() {
  const { user } = useAuthStore();
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, confirmed: 0, pending: 0 });
  const [visibility, setVisibility] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get<{ data: Application[] }>('/worker/applications', { limit: 5 }),
      apiClient.get<{ data: { visibility: string } }>('/worker/profile'),
    ])
      .then(([appRes, profileRes]) => {
        const apps = appRes.data;
        setApplications(apps.slice(0, 5));
        setVisibility(profileRes.data.visibility);
        setStats({
          total: apps.length,
          confirmed: apps.filter((a) => a.status === 'confirmed').length,
          pending: apps.filter((a) => a.status === 'pending').length,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const name = user?.workerProfile
    ? `${user.workerProfile.firstName || ''} ${user.workerProfile.lastName || ''}`.trim() || 'Специалист'
    : 'Специалист';

  const isPublic = visibility === 'public';

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Добро пожаловать, {name}!</h1>
          <p className="mt-1 text-sm text-white/50">Управляйте своей карьерой в сфере event</p>
        </div>
        <div
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            isPublic ? 'bg-emerald-500/20 text-emerald-200' : 'bg-white/10 text-white/60'
          }`}
        >
          {isPublic ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          {isPublic ? 'Анкета видна' : 'Анкета скрыта'}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Всего откликов', value: stats.total, icon: Send, color: 'text-sky-300 bg-white/10' },
          { label: 'Принятых', value: stats.confirmed, icon: Star, color: 'text-emerald-300 bg-white/10' },
          { label: 'Ожидают ответа', value: stats.pending, icon: Briefcase, color: 'text-amber-200 bg-white/10' },
        ].map((m) => (
          <div key={m.label} className="rounded-input border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${m.color}`}>
                <m.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{loading ? '—' : m.value}</div>
                <div className="text-xs text-white/50">{m.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-input border border-white/10 bg-white/[0.04] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-white">Быстрые действия</h3>
          </div>
          <div className="space-y-2">
            <Link
              href="/request"
              className="flex items-center gap-3 rounded-input border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/90 transition hover:border-primary-400/50 hover:bg-white/10"
            >
              <Inbox className="h-4 w-4 text-primary-300" />
              Персональный запрос
            </Link>
            <Link
              href="/vacancies"
              className="flex w-full items-center gap-3 rounded-input border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/90 transition hover:border-primary-400/50 hover:bg-white/10"
            >
              <Briefcase className="h-4 w-4 text-primary-300" />
              Найти вакансии
            </Link>
            <Link
              href="/worker/profile"
              className="flex w-full items-center gap-3 rounded-input border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/90 transition hover:border-primary-400/50 hover:bg-white/10"
            >
              <Send className="h-4 w-4 text-primary-300" />
              Редактировать профиль
            </Link>
          </div>
        </div>
        <div className="rounded-input border border-white/10 bg-white/[0.04] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-white">Последние отклики</h3>
            <Link href="/worker/applications" className="text-xs font-medium text-primary-300 hover:underline">
              Все →
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-white/10" />
              ))}
            </div>
          ) : applications.length === 0 ? (
            <p className="py-6 text-center text-sm text-white/40">
              Пока нет откликов. Найдите подходящую вакансию в каталоге
            </p>
          ) : (
            <div className="space-y-2">
              {applications.map((app) => (
                <div key={app.id} className="flex items-center justify-between py-1.5">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-white/90">{app.vacancy.title}</p>
                    <p className="truncate text-xs text-white/45">
                      {app.vacancy.employer.companyName ?? app.vacancy.employer.contactName}
                    </p>
                  </div>
                  <span className="ml-3 shrink-0 text-xs text-white/50">
                    {APPLICATION_STATUSES[app.status as keyof typeof APPLICATION_STATUSES] ?? app.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
