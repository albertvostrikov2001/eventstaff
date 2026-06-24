'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/lib/api/client';
import { Send, Star, Eye, EyeOff, Briefcase, Mail, Crown, Zap, TrendingUp, Loader2 } from 'lucide-react';
import { APPLICATION_STATUSES } from '@unity/shared';
import { ReliabilityWidget } from '@/components/worker/ReliabilityWidget';
import { EmployerIndividualRequestModal } from '@/components/employer/EmployerIndividualRequestModal';
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist';
import { ActionRequired } from '@/components/dashboard/ActionRequired';
import { NextStepHint } from '@/components/worker/NextStepHint';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast-context';

interface Application {
  id: string;
  status: string;
  createdAt: string;
  vacancy: {
    title: string;
    employer: { companyName: string | null; contactName: string | null };
  };
}

interface ProfileStats {
  viewsCount: number;
  isBoosted: boolean;
  boostUntil: string | null;
  boostAvailable: boolean;
}

interface Subscription {
  key: string;
  label: string;
  isPremium: boolean;
  currentPeriodEnd: string | null;
  grantedByAdmin: boolean;
  hasProfileStats: boolean;
  hasFreeBoost: boolean;
}

interface ApplicationUsage {
  used: number;
  limit: number;
  unlimited: boolean;
}

interface Summary {
  applicationsCount: number;
  activeShiftsCount: number;
  pendingInvitationsCount: number;
  applicationUsage?: ApplicationUsage;
  subscription: Subscription;
  profileStats: ProfileStats | null;
}

interface PendingInvitation {
  id: string;
  status: string;
  createdAt: string;
  vacancy: { title: string; employer: { companyName: string | null; contactName: string | null } };
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function WorkerDashboardPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [visibility, setVisibility] = useState<string | null>(null);
  const [profileFilled, setProfileFilled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [boosting, setBoosting] = useState(false);

  const load = () => {
    Promise.all([
      apiClient.get<{ data: Application[] }>('/worker/applications', { limit: 5 }),
      apiClient.get<{
        data: {
          visibility: string;
          firstName?: string | null;
          lastName?: string | null;
          cityId?: string | null;
          categories?: unknown[];
        };
      }>('/worker/profile'),
      apiClient.get<{ data: PendingInvitation[] }>('/worker/applications', { status: 'invited', page: 1 }),
      apiClient.get<{ data: Summary }>('/worker/dashboard/summary'),
    ])
      .then(([appRes, profileRes, invRes, summaryRes]) => {
        setApplications(appRes.data.slice(0, 5));
        setVisibility(profileRes.data.visibility);
        setProfileFilled(
          !!(
            profileRes.data.firstName &&
            profileRes.data.lastName &&
            profileRes.data.cityId &&
            (profileRes.data.categories?.length ?? 0) > 0
          ),
        );
        setSummary(summaryRes.data);
        setPendingInvitations((invRes.data ?? []).slice(0, 3));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBoost = async () => {
    setBoosting(true);
    try {
      await apiClient.post('/worker/boost', {});
      toast('Буст активирован! Ваша анкета поднята в топ на 3 дня 🚀', 'success');
      load();
    } catch {
      toast('Не удалось активировать буст', 'error');
    } finally {
      setBoosting(false);
    }
  };

  const name = user?.workerProfile
    ? `${user.workerProfile.firstName || ''} ${user.workerProfile.lastName || ''}`.trim() || 'Специалист'
    : 'Специалист';

  const isPublic = visibility === 'public';
  const sub = summary?.subscription;
  const stats = summary?.profileStats;

  return (
    <div>
      <EmployerIndividualRequestModal open={requestModalOpen} onOpenChange={setRequestModalOpen} role="worker" />

      <div className="flex flex-wrap items-start justify-between gap-3">
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

      {!loading && (
        <NextStepHint
          profileFilled={profileFilled}
          isPublic={isPublic}
          applicationsCount={summary?.applicationsCount ?? 0}
          pendingInvitations={summary?.pendingInvitationsCount ?? 0}
          activeShifts={summary?.activeShiftsCount ?? 0}
        />
      )}

      {!loading && (
        <OnboardingChecklist
          title="Начните работу на платформе"
          items={[
            {
              label: 'Заполните профиль: имя, город, специализация',
              done: profileFilled,
              href: '/worker/profile',
              cta: 'Заполнить',
            },
            {
              label: 'Сделайте анкету публичной',
              done: isPublic,
              href: '/worker/profile',
              cta: 'Открыть',
            },
            {
              label: 'Откликнитесь на первую вакансию',
              done: (summary?.applicationsCount ?? 0) > 0,
              href: '/vacancies',
              cta: 'Найти',
            },
          ]}
        />
      )}

      {!loading && (
        <ActionRequired
          items={[
            {
              label: 'Приглашения ждут ответа',
              href: '/worker/invitations',
              count: summary?.pendingInvitationsCount ?? 0,
            },
            {
              label: 'Смены требуют подтверждения',
              href: '/worker/shifts',
              count: summary?.activeShiftsCount ?? 0,
            },
          ]}
        />
      )}

      {/* Subscription widget */}
      {!loading && sub && (
        <div
          className={`mt-6 rounded-[14px] border p-4 ${
            sub.isPremium
              ? 'border-emerald-500/30 bg-emerald-500/8'
              : 'border-white/[0.08] bg-white/[0.03]'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                  sub.isPremium ? 'bg-emerald-500/20' : 'bg-white/[0.06]'
                }`}
              >
                {sub.isPremium ? (
                  <Crown className="h-[18px] w-[18px] text-emerald-300" />
                ) : (
                  <Zap className="h-[18px] w-[18px] text-white/40" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white/90">
                    Тариф: {sub.label}
                  </span>
                  {sub.grantedByAdmin && (
                    <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-300">
                      от администратора
                    </span>
                  )}
                </div>
                {sub.isPremium && sub.currentPeriodEnd ? (
                  <p className="text-xs text-white/45">Активен до {fmtDate(sub.currentPeriodEnd)}</p>
                ) : (
                  <p className="text-xs text-white/45">
                    Обновитесь до Premium — безлимитные отклики и буст анкеты
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Boost button for premium */}
              {sub.isPremium && stats?.boostAvailable && (
                <button
                  onClick={handleBoost}
                  disabled={boosting}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/30 disabled:opacity-60"
                >
                  {boosting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                  {boosting ? 'Активируем...' : 'Активировать буст'}
                </button>
              )}
              {sub.isPremium && stats?.isBoosted && stats.boostUntil && (
                <span className="flex items-center gap-1.5 rounded-xl bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-300">
                  <Zap className="h-3.5 w-3.5" />
                  Буст до {fmtDate(stats.boostUntil)}
                </span>
              )}
              {!sub.isPremium && (
                <Link
                  href="/worker/subscription"
                  className="rounded-xl bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 transition"
                >
                  Подключить Premium →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Всего откликов', value: summary?.applicationsCount ?? 0, icon: Send, color: 'text-sky-300 bg-white/10' },
          { label: 'Принятых', value: summary?.activeShiftsCount ?? 0, icon: Star, color: 'text-emerald-300 bg-white/10' },
          { label: 'Ожидают ответа', value: summary?.pendingInvitationsCount ?? 0, icon: Briefcase, color: 'text-amber-200 bg-white/10' },
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

      {/* Profile stats (Premium only) */}
      {!loading && sub?.isPremium && stats && (
        <div className="mt-4 rounded-input border border-emerald-500/20 bg-emerald-500/5 p-5">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-300" />
            <h3 className="text-sm font-semibold text-white/90">Статистика профиля</h3>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
              Premium
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <div className="text-2xl font-bold text-white">{stats.viewsCount}</div>
              <div className="text-xs text-white/50">Просмотров профиля</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {stats.isBoosted ? (
                  <span className="text-amber-400">В топе ⚡</span>
                ) : stats.boostAvailable ? (
                  <span className="text-white/60">Доступен</span>
                ) : (
                  <span className="text-white/30">Использован</span>
                )}
              </div>
              <div className="text-xs text-white/50">Буст анкеты</div>
            </div>
          </div>
          {stats.isBoosted && stats.boostUntil && (
            <p className="mt-2 text-xs text-amber-300/70">
              ⚡ Анкета поднята в топ каталога до {fmtDate(stats.boostUntil)}
            </p>
          )}
        </div>
      )}

      {/* Application limit usage (free plan) */}
      {!loading && summary?.applicationUsage && !summary.applicationUsage.unlimited && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-white/[0.08] bg-white/[0.04] p-4">
          <span className="text-sm text-white/70">
            Отклики в этом месяце:{' '}
            <span className="font-semibold text-white">
              {summary.applicationUsage.used} / {summary.applicationUsage.limit}
            </span>
            {summary.applicationUsage.used >= summary.applicationUsage.limit && (
              <span className="ml-2 text-amber-300">лимит исчерпан</span>
            )}
          </span>
          {!sub?.isPremium && (
            <Link
              href="/worker/subscription"
              className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/30"
            >
              Безлимит с Premium →
            </Link>
          )}
        </div>
      )}

      {/* Reliability Widget */}
      <div className="mt-8">
        <ReliabilityWidget />
      </div>

      <div className="mt-8 rounded-[14px] border border-white/[0.08] bg-white/[0.04] bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-6">
        <h3 className="text-lg font-semibold text-white">Не нашли подходящую вакансию?</h3>
        <p className="mt-2 max-w-xl text-sm text-white/55">
          Оставьте заявку — мы подберём подходящие предложения и свяжемся с вами в течение 24 часов.
        </p>
        <Button
          type="button"
          variant="primary"
          size="md"
          className="mt-4 rounded-xl shadow-lg"
          onClick={() => setRequestModalOpen(true)}
        >
          Оставить персональный запрос
        </Button>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-input border border-white/10 bg-white/[0.04] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-white">Быстрые действия</h3>
          </div>
          <div className="space-y-2">
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
            {sub && !sub.isPremium && (
              <Link
                href="/worker/subscription"
                className="flex w-full items-center gap-3 rounded-input border border-emerald-500/30 bg-emerald-500/8 px-4 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/15"
              >
                <Crown className="h-4 w-4" />
                Подключить Premium
              </Link>
            )}
          </div>
        </div>
        {pendingInvitations.length > 0 && (
          <div className="rounded-input border border-white/10 bg-white/[0.04] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold text-white">
                <Mail className="h-4 w-4 text-primary-300" />
                Приглашения
                <span className="rounded-full bg-primary-500/30 px-2 py-0.5 text-xs font-bold text-primary-300">
                  {pendingInvitations.length}
                </span>
              </h3>
              <Link href="/worker/invitations" className="text-xs font-medium text-primary-300 hover:underline">
                Все →
              </Link>
            </div>
            <div className="space-y-2">
              {pendingInvitations.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between py-1.5">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-white/90">{inv.vacancy.title}</p>
                    <p className="truncate text-xs text-white/45">
                      {inv.vacancy.employer.companyName ?? inv.vacancy.employer.contactName}
                    </p>
                  </div>
                  <Link
                    href="/worker/invitations"
                    className="ml-3 shrink-0 rounded-badge bg-primary-500/20 px-2.5 py-0.5 text-xs font-medium text-primary-300 hover:bg-primary-500/30"
                  >
                    Ответить
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

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
