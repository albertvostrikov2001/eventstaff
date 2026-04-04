'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/lib/api/client';
import { FileText, Users, Heart, Plus, Search, ShieldCheck, Shield } from 'lucide-react';

interface Stats {
  activeVacancies: number;
  pendingApplications: number;
  favoriteWorkers: number;
}

interface Application {
  id: string;
  status: string;
  createdAt: string;
  vacancy: { id: string; title: string };
  worker: { firstName: string; lastName: string };
}

export default function EmployerDashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Stats>({ activeVacancies: 0, pendingApplications: 0, favoriteWorkers: 0 });
  const [recentApplications, setRecentApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get<{ data: { id: string; status: string; _count: { applications: number } }[] }>('/employer/vacancies'),
      apiClient.get<{ data: unknown[] }>('/employer/favorites/workers'),
    ])
      .then(([vacRes, favRes]) => {
        const activeVacancies = vacRes.data.filter((v) => v.status === 'active').length;
        const pendingApplications = vacRes.data.reduce(
          (sum, v) => sum + (v._count?.applications ?? 0),
          0,
        );
        setStats({
          activeVacancies,
          pendingApplications,
          favoriteWorkers: favRes.data.length,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const name = user?.employerProfile?.companyName
    || user?.employerProfile?.contactName
    || 'Работодатель';

  const isVerified = user?.employerProfile?.isVerified ?? false;

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Добро пожаловать, {name}!</h1>
          <p className="mt-1 text-sm text-gray-500">Управляйте наймом event-персонала</p>
        </div>
        <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
          isVerified ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
        }`}>
          {isVerified ? <ShieldCheck className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
          {isVerified ? 'Верифицирован' : 'Не верифицирован'}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Активных вакансий', value: stats.activeVacancies, icon: FileText, color: 'text-blue-600 bg-blue-50' },
          { label: 'Откликов', value: stats.pendingApplications, icon: Users, color: 'text-purple-600 bg-purple-50' },
          { label: 'В избранном', value: stats.favoriteWorkers, icon: Heart, color: 'text-pink-600 bg-pink-50' },
        ].map((m) => (
          <div key={m.label} className="rounded-card border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${m.color}`}>
                <m.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{loading ? '—' : m.value}</div>
                <div className="text-xs text-gray-500">{m.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-card border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-gray-900">Быстрые действия</h3>
          <div className="space-y-2">
            <Link
              href="/employer/vacancies/new"
              className="flex items-center gap-3 rounded-input border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
            >
              <Plus className="h-4 w-4 text-primary-500" />
              Создать вакансию
            </Link>
            <Link
              href="/employer/workers"
              className="flex items-center gap-3 rounded-input border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
            >
              <Search className="h-4 w-4 text-primary-500" />
              Найти персонал
            </Link>
          </div>
        </div>

        <div className="rounded-card border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Последние отклики</h3>
            <Link href="/employer/vacancies" className="text-xs font-medium text-primary-600 hover:underline">
              Все →
            </Link>
          </div>
          {recentApplications.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">Откликов пока нет</p>
          ) : (
            <div className="space-y-2">
              {recentApplications.map((a) => (
                <div key={a.id} className="py-1.5 text-sm text-gray-800">
                  <span className="font-medium">{a.worker.firstName} {a.worker.lastName}</span>
                  {' → '}
                  {a.vacancy.title}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
