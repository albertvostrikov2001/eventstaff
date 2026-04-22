'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/lib/api/client';
import { FileText, Users, Heart, Plus, Search, ShieldCheck, Shield, Eye, Send } from 'lucide-react';

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
  const [usage, setUsage] = useState<{
    used: number;
    limit: number;
    unlimited: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get<{ data: { id: string; status: string; _count: { applications: number } }[] }>('/employer/vacancies'),
      apiClient.get<{ data: unknown[] }>('/employer/favorites/workers'),
      apiClient.get<{ data: { used: number; limit: number; unlimited: boolean } }>('/user/review-usage').catch(() => null),
    ])
      .then(([vacRes, favRes, usageRes]) => {
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
        if (usageRes?.data) setUsage(usageRes.data);
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
          <h1 className="text-2xl font-bold text-white">Добро пожаловать, {name}!</h1>
          <p className="mt-1 text-sm text-white/50">Управляйте наймом event-персонала</p>
        </div>
        <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
          isVerified ? 'bg-emerald-500/20 text-emerald-200' : 'bg-white/10 text-white/60'
        }`}>
          {isVerified ? <ShieldCheck className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
          {isVerified ? 'Верифицирован' : 'Не верифицирован'}
        </div>
      </div>

      {usage && !usage.unlimited && (
        <div className="mt-6 rounded-input border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center justify-between text-sm text-white/80">
            <span className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary-300" />
              Просмотрено профилей: {usage.used} из {usage.limit}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-primary-400/80 transition-all"
              style={{ width: `${Math.min(100, (usage.used / Math.max(1, usage.limit)) * 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Активных вакансий', value: stats.activeVacancies, icon: FileText, color: 'text-sky-300 bg-white/10' },
          { label: 'Откликов', value: stats.pendingApplications, icon: Users, color: 'text-violet-300 bg-white/10' },
          { label: 'В избранном', value: stats.favoriteWorkers, icon: Heart, color: 'text-pink-300 bg-white/10' },
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
          <h3 className="mb-4 font-semibold text-white">Быстрые действия</h3>
          <div className="space-y-2">
            <Link
              href="/employer/vacancies/new"
              className="flex items-center gap-3 rounded-input border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/90 transition hover:border-primary-400/50 hover:bg-white/10"
            >
              <Plus className="h-4 w-4 text-primary-400" />
              Создать вакансию
            </Link>
            <Link
              href="/employer/workers"
              className="flex items-center gap-3 rounded-input border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/90 transition hover:border-primary-400/50 hover:bg-white/10"
            >
              <Search className="h-4 w-4 text-primary-400" />
              Найти персонал
            </Link>
            <Link
              href="/request"
              className="flex items-center gap-3 rounded-input border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/90 transition hover:border-primary-400/50 hover:bg-white/10"
            >
              <Send className="h-4 w-4 text-primary-400" />
              Персональный запрос
            </Link>
          </div>
        </div>

        <div className="rounded-input border border-white/10 bg-white/[0.04] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-white">Последние отклики</h3>
            <Link href="/employer/vacancies" className="text-xs font-medium text-primary-300 hover:underline">
              Все →
            </Link>
          </div>
          {recentApplications.length === 0 ? (
            <p className="py-6 text-center text-sm text-white/40">
              Пока нет откликов. Опубликуйте вакансию — кандидаты появятся здесь
            </p>
          ) : (
            <div className="space-y-2">
              {recentApplications.map((a) => (
                <div key={a.id} className="py-1.5 text-sm text-white/85">
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
