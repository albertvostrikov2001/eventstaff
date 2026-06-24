'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { APPLICATION_STATUSES, STAFF_CATEGORIES } from '@unity/shared';
import { Briefcase, Clock, MapPin, Star, CheckCircle, XCircle } from 'lucide-react';
import { EmployerLogoMark } from '@/components/employer/EmployerLogoMark';
import { useInvitationRespond } from '@/hooks/useApplyToVacancy';
import { ScheduleConflictDialog } from '@/components/worker/ScheduleConflictDialog';
import { DeclineInvitationModal } from '@/components/worker/DeclineInvitationModal';
import { ApplicationProgress } from '@/components/applications/ApplicationProgress';
import { OpenChatButton } from '@/components/chat/OpenChatButton';
import { NextStepReminderModal } from '@/components/shifts/NextStepReminderModal';

const CHAT_READY = new Set(['invited', 'confirmed', 'shift_started', 'completed']);

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
      logoUrl?: string | null;
      userId: string;
    };
    city: { name: string } | null;
  };
}

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-amber-500/15 text-amber-300 border border-amber-500/30',
  viewed:    'bg-sky-500/15 text-sky-300 border border-sky-500/30',
  invited:   'bg-violet-500/15 text-violet-300 border border-violet-500/30',
  confirmed: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  rejected:  'bg-red-500/15 text-red-300 border border-red-500/30',
  cancelled: 'bg-white/[0.06] text-white/45 border border-white/[0.10]',
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
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [declineSaving, setDeclineSaving] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const {
    acceptingId,
    pendingConflict,
    accept,
    confirmConflict,
    dismissConflict,
  } = useInvitationRespond();

  useEffect(() => {
    setLoading(true);
    apiClient
      .get<{ data: Application[] }>('/worker/applications', activeTab ? { status: activeTab } : undefined)
      .then((res) => setApplications(res.data))
      .catch(() => toast('Не удалось загрузить отклики', 'error'))
      .finally(() => setLoading(false));
  }, [activeTab, toast]);

  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  const markStatus = (id: string, status: AppStatus) =>
    setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));

  const handleWithdraw = async (id: string) => {
    if (!window.confirm('Отозвать отклик? Это действие нельзя отменить.')) return;
    setWithdrawingId(id);
    try {
      await apiClient.patch(`/worker/applications/${id}/withdraw`);
      toast('Отклик отозван', 'success');
      markStatus(id, 'cancelled' as AppStatus);
    } catch {
      toast('Не удалось отозвать отклик', 'error');
    } finally {
      setWithdrawingId(null);
    }
  };

  const handleAccept = async (id: string) => {
    const ok = await accept(id);
    if (ok) {
      markStatus(id, 'confirmed' as AppStatus);
      setShowReminder(true);
    }
  };

  const handleDeclineConfirm = async (message: string) => {
    if (!decliningId) return;
    setDeclineSaving(true);
    try {
      await apiClient.patch(`/worker/applications/${decliningId}/respond`, {
        action: 'DECLINE',
        message: message || undefined,
      });
      toast('Приглашение отклонено.', 'success');
      markStatus(decliningId, 'rejected' as AppStatus);
      setDecliningId(null);
    } catch {
      toast('Ошибка. Попробуйте ещё раз.', 'error');
    } finally {
      setDeclineSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Мои отклики</h1>
      <p className="mt-1 text-sm text-white/55">Статусы ваших откликов на вакансии</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
              activeTab === tab.key
                ? 'bg-primary-500 text-white'
                : 'border border-white/10 bg-white/[0.04] text-white/60 hover:border-primary-400/40 hover:bg-white/[0.06]'
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
              <div key={i} className="h-24 animate-pulse rounded-card bg-white/10" />
            ))}
          </div>
        ) : applications.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-card border border-white/10 bg-white/[0.04] py-16 text-center">
            <Briefcase className="h-10 w-10 text-white/30" />
            <h3 className="font-semibold text-white/90">Откликов пока нет</h3>
            <p className="text-sm text-white/50">Найдите подходящие вакансии и откликнитесь</p>
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
                className="rounded-card border border-white/[0.08] bg-white/[0.04] p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <EmployerLogoMark
                    size="md"
                    className="shrink-0"
                    logoUrl={app.vacancy.employer.logoUrl ?? null}
                    companyName={app.vacancy.employer.companyName}
                    contactName={app.vacancy.employer.contactName}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white/90">{app.vacancy.title}</h3>
                      {app.vacancy.employer.isVerified && (
                        <span className="text-xs text-emerald-400">✓</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-white/55">
                      {app.vacancy.employer.companyName ?? app.vacancy.employer.contactName}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-white/45">
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
                      <span className="font-medium text-white/65">
                        {Number(app.vacancy.rate).toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {app.status === 'invited' && (
                      <div className="mb-1 text-xs font-medium text-violet-300">
                        <Star className="inline h-3 w-3" /> Вас пригласили!
                      </div>
                    )}
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[app.status] ?? 'bg-white/[0.06] text-white/45'
                      }`}
                    >
                      {APPLICATION_STATUSES[app.status as keyof typeof APPLICATION_STATUSES] ?? app.status}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
                  <ApplicationProgress status={app.status} />
                  <div className="flex items-center gap-3">
                    {CHAT_READY.has(app.status) && app.vacancy.employer.userId && (
                      <OpenChatButton
                        recipientUserId={app.vacancy.employer.userId}
                        context={{ type: 'APPLICATION', id: app.id }}
                        label="Написать работодателю"
                        className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-white/30 hover:text-white/90"
                      />
                    )}
                    {app.status === 'confirmed' && (
                      <Link
                        href="/worker/shifts"
                        className="text-xs font-medium text-emerald-300 transition hover:text-emerald-200"
                      >
                        Перейти к смене →
                      </Link>
                    )}
                  </div>
                </div>

                {app.status === 'invited' && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-4">
                    <button
                      onClick={() => void handleAccept(app.id)}
                      disabled={acceptingId === app.id}
                      className="flex items-center gap-1.5 rounded-full bg-primary-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-600 disabled:opacity-50"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      {acceptingId === app.id ? 'Принимаем...' : 'Принять'}
                    </button>
                    <button
                      onClick={() => setDecliningId(app.id)}
                      disabled={acceptingId === app.id}
                      className="flex items-center gap-1.5 rounded-full border border-red-500/40 px-4 py-1.5 text-xs font-semibold text-red-300 transition hover:border-red-500/70 disabled:opacity-50"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Отклонить
                    </button>
                    <Link
                      href={`/vacancies/${app.vacancy.id}`}
                      className="ml-auto text-xs text-white/40 transition hover:text-white/70"
                    >
                      Посмотреть вакансию →
                    </Link>
                  </div>
                )}

                {(app.status === 'pending' || app.status === 'viewed') && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-4">
                    <button
                      onClick={() => handleWithdraw(app.id)}
                      disabled={withdrawingId === app.id}
                      className="flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-1.5 text-xs font-semibold text-white/60 transition hover:border-white/30 hover:text-white/80 disabled:opacity-50"
                    >
                      {withdrawingId === app.id ? 'Отзываем…' : 'Отозвать отклик'}
                    </button>
                    <Link
                      href={`/vacancies/${app.vacancy.id}`}
                      className="ml-auto text-xs text-white/40 transition hover:text-white/70"
                    >
                      Посмотреть вакансию →
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {decliningId && (
        <DeclineInvitationModal
          onConfirm={handleDeclineConfirm}
          onClose={() => setDecliningId(null)}
          loading={declineSaving}
        />
      )}

      <ScheduleConflictDialog
        open={pendingConflict !== null}
        message={pendingConflict?.message ?? ''}
        conflicts={pendingConflict?.conflicts ?? []}
        confirming={acceptingId !== null}
        onConfirm={async () => {
          const id = pendingConflict?.invitationId;
          const ok = await confirmConflict();
          if (ok && id) {
            markStatus(id, 'confirmed' as AppStatus);
            setShowReminder(true);
          }
        }}
        onDismiss={dismissConflict}
        confirmLabel="Всё равно принять"
      />

      {showReminder && (
        <NextStepReminderModal variant="worker" onClose={() => setShowReminder(false)} />
      )}
    </div>
  );
}
