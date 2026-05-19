'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/lib/api/client';
import {
  FileText,
  Users,
  Heart,
  Plus,
  Search,
  ShieldCheck,
  Shield,
  Eye,
  Send,
} from 'lucide-react';
import { EmployerIndividualRequestModal } from '@/components/employer/EmployerIndividualRequestModal';
import { EmployerRecentApplicationsSection } from '@/components/employer/EmployerRecentApplicationsSection';

interface Stats {
  activeVacancies: number;
  pendingApplications: number;
  favoriteWorkers: number;
}

interface MyIndividualRequestRow {
  id: string;
  status: string;
  quantity: number | null;
  staffNeeded: string | null;
  createdAt: string;
}

function cardCls() {
  return 'rounded-[14px] border border-white/[0.08] bg-white/[0.04]';
}

const IR_STATUS_LABEL: Record<string, string> = {
  NEW: 'Новая',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Закрыта',
  REJECTED: 'Отклонена',
};

export default function EmployerDashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Stats>({
    activeVacancies: 0,
    pendingApplications: 0,
    favoriteWorkers: 0,
  });
  const [usage, setUsage] = useState<{
    used: number;
    limit: number;
    unlimited: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [myRequests, setMyRequests] = useState<MyIndividualRequestRow[]>([]);
  const [individualRequestsNonce, setIndividualRequestsNonce] = useState(0);

  useEffect(() => {
    Promise.all([
      apiClient.get<{ data: { id: string; status: string; _count: { applications: number } }[] }>(
        '/employer/vacancies',
      ),
      apiClient.get<{ data: unknown[] }>('/employer/favorites/workers'),
      apiClient
        .get<{ data: { used: number; limit: number; unlimited: boolean } }>('/user/review-usage')
        .catch(() => null),
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

  useEffect(() => {
    apiClient
      .get<{ success?: boolean; data: MyIndividualRequestRow[] }>('/employer/individual-requests', {
        page: 1,
      })
      .then((res) => setMyRequests(res.data.slice(0, 6)))
      .catch(() => setMyRequests([]));
  }, [individualRequestsNonce]);

  const name =
    user?.employerProfile?.companyName ||
    user?.employerProfile?.contactName ||
    'Работодатель';

  const isVerified = user?.employerProfile?.isVerified ?? false;

  const hasVacancies = stats.activeVacancies > 0;

  const bumpIr = () => setIndividualRequestsNonce((n) => n + 1);

  return (
    <div>
      <EmployerIndividualRequestModal open={requestModalOpen} onOpenChange={setRequestModalOpen} onSuccess={bumpIr} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Добро пожаловать, {name}!</h1>
          <p className="mt-1 text-sm text-white/50">Управляйте наймом event-персонала</p>
        </div>
        <div
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            isVerified ? 'bg-emerald-500/20 text-emerald-200' : 'bg-white/10 text-white/60'
          }`}
        >
          {isVerified ? <ShieldCheck className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
          {isVerified ? 'Верифицирован' : 'Не верифицирован'}
        </div>
      </div>

      {usage && !usage.unlimited && (
        <div className={`mt-6 p-4 ${cardCls()}`}>
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
          {
            label: 'Активных вакансий',
            value: stats.activeVacancies,
            icon: FileText,
            color: 'text-sky-300 bg-white/10',
          },
          { label: 'Откликов', value: stats.pendingApplications, icon: Users, color: 'text-violet-300 bg-white/10' },
          { label: 'В избранном', value: stats.favoriteWorkers, icon: Heart, color: 'text-pink-300 bg-white/10' },
        ].map((m) => (
          <div key={m.label} className={`p-5 ${cardCls()}`}>
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

      <div className="mt-8 space-y-6">
        <div className={`p-6 ${cardCls()} bg-gradient-to-br from-white/[0.06] to-white/[0.02]`}>
          <h3 className="text-lg font-semibold text-white">Не нашли подходящих кандидатов?</h3>
          <p className="mt-2 max-w-xl text-sm text-white/55">
            Мы подберём персонал лично для вас. Оставьте заявку — менеджер свяжется с вами в течение 24 часов.
          </p>
          <button
            type="button"
            className="mt-4 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 px-6 py-2.5 text-sm font-semibold text-gray-950 shadow-lg transition hover:brightness-105"
            onClick={() => setRequestModalOpen(true)}
          >
            Оставить персональный запрос
          </button>
        </div>

        {myRequests.length > 0 && (
          <div className={`p-6 ${cardCls()}`}>
            <h3 className="mb-4 font-semibold text-white">История ваших запросов</h3>
            <ul className="divide-y divide-white/[0.06]">
              {myRequests.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                  <time className="text-white/45" dateTime={r.createdAt}>
                    {new Date(r.createdAt).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium uppercase text-white/85">
                    {IR_STATUS_LABEL[r.status] ?? r.status}
                  </span>
                  {r.quantity != null ? (
                    <span className="text-white/60">до {r.quantity} чел.</span>
                  ) : (
                    <span className="truncate text-white/60">{r.staffNeeded?.slice(0, 80) ?? ''}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className={`p-6 ${cardCls()}`}>
            <h3 className="mb-4 font-semibold text-white">Быстрые действия</h3>
            <div className="space-y-2">
              <Link
                href="/employer/vacancies/new"
                className="flex items-center gap-3 rounded-[14px] border border-white/[0.08] bg-white/5 px-4 py-3 text-sm font-medium text-white/90 transition hover:border-primary-400/50 hover:bg-white/10"
              >
                <Plus className="h-4 w-4 text-primary-400" />
                Создать вакансию
              </Link>
              <Link
                href="/employer/workers"
                className="flex items-center gap-3 rounded-[14px] border border-white/[0.08] bg-white/5 px-4 py-3 text-sm font-medium text-white/90 transition hover:border-primary-400/50 hover:bg-white/10"
              >
                <Search className="h-4 w-4 text-primary-400" />
                Найти персонал
              </Link>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-[14px] border border-white/[0.08] bg-white/5 px-4 py-3 text-left text-sm font-medium text-white/90 transition hover:border-primary-400/50 hover:bg-white/10"
                onClick={() => setRequestModalOpen(true)}
              >
                <Send className="h-4 w-4 text-primary-400" />
                Персональный запрос
              </button>
            </div>
          </div>

          <EmployerRecentApplicationsSection hasVacancies={hasVacancies} />
        </div>
      </div>
    </div>
  );
}
