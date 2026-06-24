'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import {
  Zap,
  Search,
  X,
  Crown,
  Building2,
  Calendar,
  CheckCircle,
  Loader2,
  Plus,
  User,
} from 'lucide-react';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';

// ── Types ──────────────────────────────────────────────────────────────────
interface WorkerSub {
  id: string;
  workerId: string;
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  grantedByAdmin: boolean;
  createdAt: string;
  worker: { firstName: string; lastName: string; userId: string };
}

interface EmployerSub {
  id: string;
  employerId: string;
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  grantedByAdmin: boolean;
  createdAt: string;
  employer: { companyName: string | null; contactName: string | null; userId: string };
}

interface SearchUser {
  id: string;
  email: string | null;
  workerProfile: { id: string; firstName: string; lastName: string } | null;
  employerProfile: { id: string; companyName: string | null; contactName: string | null } | null;
  roles: { role: string }[];
}

// ── Constants ──────────────────────────────────────────────────────────────
const WORKER_PLANS = [{ value: 'premium', label: 'Premium' }];

const EMPLOYER_PLANS = [
  { value: 'basic', label: 'Бизнес' },
  { value: 'pro', label: 'Про' },
];

const PLAN_LABELS: Record<string, string> = {
  free: 'Бесплатный',
  premium: 'Premium',
  basic: 'Бизнес',
  pro: 'Про',
  enterprise: 'Enterprise',
};

const PLAN_COLORS: Record<string, string> = {
  premium: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  basic: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  pro: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  enterprise: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
};

function fmtDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── Grant Modal ────────────────────────────────────────────────────────────
function GrantModal({ onClose, onGranted }: { onClose: () => void; onGranted: () => void }) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [role, setRole] = useState<'worker' | 'employer'>('worker');
  const [plan, setPlan] = useState('premium');
  const [months, setMonths] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const searchTimer = useRef<NodeJS.Timeout | null>(null);

  // Автодетект роли при выборе пользователя
  useEffect(() => {
    if (!selectedUser) return;
    const hasWorker = !!selectedUser.workerProfile;
    const hasEmployer = !!selectedUser.employerProfile;
    if (hasWorker && !hasEmployer) {
      setRole('worker');
      setPlan('premium');
    } else if (hasEmployer && !hasWorker) {
      setRole('employer');
      setPlan('basic');
    }
  }, [selectedUser]);

  // При смене роли — сбросить план на первый доступный
  useEffect(() => {
    if (role === 'worker') setPlan('premium');
    else setPlan('basic');
  }, [role]);

  const handleSearch = (val: string) => {
    setSearch(val);
    setSelectedUser(null);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!val.trim()) {
      setSearchResults([]);
      return;
    }
    searchTimer.current = setTimeout(() => {
      setSearching(true);
      void apiClient
        .get<{ data: SearchUser[] }>('/admin/users', { search: val, limit: 6 })
        .then((r) => setSearchResults(r.data ?? []))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 350);
  };

  const handleSubmit = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await apiClient.patch(`/admin/users/${selectedUser.id}/subscription`, { role, plan, months });
      toast(`Подписка ${PLAN_LABELS[plan] ?? plan} выдана`, 'success');
      onGranted();
      onClose();
    } catch {
      toast('Не удалось выдать подписку', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const availablePlans = role === 'worker' ? WORKER_PLANS : EMPLOYER_PLANS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 shadow-2xl"
        style={{ background: 'var(--bg-2)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2 text-[var(--text-primary)]">
            <Zap className="h-5 w-5 text-amber-400" />
            <span className="font-semibold">Выдать подписку</span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          {/* User search */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
              Пользователь
            </label>
            {selectedUser ? (
              <div className="flex items-center justify-between rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {selectedUser.workerProfile
                      ? `${selectedUser.workerProfile.firstName} ${selectedUser.workerProfile.lastName}`
                      : selectedUser.employerProfile?.companyName ?? selectedUser.email ?? 'Пользователь'}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">{selectedUser.email}</p>
                </div>
                <button
                  onClick={() => { setSelectedUser(null); setSearch(''); setSearchResults([]); }}
                  className="rounded-lg p-1 text-[var(--text-secondary)] hover:text-red-400 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Имя, email или компания..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:border-[var(--accent)] focus:outline-none transition-colors"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--text-secondary)]" />
                )}
                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-auto rounded-xl border border-white/10 py-1 shadow-xl" style={{ background: 'var(--bg-1)' }}>
                    {searchResults.map((u) => {
                      const name = u.workerProfile
                        ? `${u.workerProfile.firstName} ${u.workerProfile.lastName}`
                        : u.employerProfile?.companyName ?? u.email ?? 'Пользователь';
                      const sub = u.workerProfile
                        ? 'Работник'
                        : u.employerProfile
                        ? 'Работодатель'
                        : 'Нет профиля';
                      return (
                        <button
                          key={u.id}
                          onClick={() => { setSelectedUser(u); setSearch(''); setSearchResults([]); }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-white/5 transition-colors"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/20">
                            <User className="h-4 w-4 text-[var(--accent)]" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[var(--text-primary)]">{name}</p>
                            <p className="truncate text-xs text-[var(--text-secondary)]">{sub} · {u.email}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                {search && !searching && searchResults.length === 0 && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-white/10 px-4 py-3 text-center text-sm text-[var(--text-secondary)] shadow-xl" style={{ background: 'var(--bg-1)' }}>
                    Пользователи не найдены
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Role selector */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">Роль</label>
            <div className="grid grid-cols-2 gap-2">
              {(['worker', 'employer'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  disabled={
                    selectedUser
                      ? r === 'worker'
                        ? !selectedUser.workerProfile
                        : !selectedUser.employerProfile
                      : false
                  }
                  className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                    role === r
                      ? 'border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--accent)]'
                      : 'border-white/10 bg-white/5 text-[var(--text-secondary)] hover:border-white/20'
                  }`}
                >
                  {r === 'worker' ? <User className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                  {r === 'worker' ? 'Работник' : 'Работодатель'}
                </button>
              ))}
            </div>
          </div>

          {/* Plan selector */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">Тариф</label>
            <div className="grid grid-cols-2 gap-2">
              {availablePlans.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPlan(p.value)}
                  className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-all ${
                    plan === p.value
                      ? 'border-amber-400/40 bg-amber-400/10 text-amber-400'
                      : 'border-white/10 bg-white/5 text-[var(--text-secondary)] hover:border-white/20'
                  }`}
                >
                  <Crown className="h-4 w-4" />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Months */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
              Срок (месяцев): <span className="text-[var(--text-primary)] font-semibold">{months}</span>
            </label>
            <input
              type="range"
              min={1}
              max={24}
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="w-full accent-[var(--accent)]"
            />
            <div className="mt-1 flex justify-between text-xs text-[var(--text-secondary)]">
              <span>1 мес.</span>
              <span>12 мес.</span>
              <span>24 мес.</span>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!selectedUser || submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            {submitting ? 'Выдаём...' : `Выдать ${PLAN_LABELS[plan] ?? plan} на ${months} мес.`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function AdminSubscriptionsPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<'workers' | 'employers'>('workers');
  const [workers, setWorkers] = useState<WorkerSub[]>([]);
  const [employers, setEmployers] = useState<EmployerSub[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    void apiClient
      .get<{ data: { workers: WorkerSub[]; employers: EmployerSub[] } }>('/admin/subscriptions')
      .then((r) => {
        setWorkers(r.data.workers ?? []);
        setEmployers(r.data.employers ?? []);
      })
      .catch(() => toast('Ошибка загрузки подписок', 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const currentList = tab === 'workers' ? workers : employers;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--text-primary)]">
            <Zap className="h-6 w-6 text-amber-400" />
            Подписки
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Активные платные тарифы пользователей
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Выдать подписку
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1 w-fit">
        {([
          { key: 'workers', label: 'Работники', count: workers.length, icon: User },
          { key: 'employers', label: 'Работодатели', count: employers.length, icon: Building2 },
        ] as const).map(({ key, label, count, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              tab === key
                ? 'bg-[var(--accent)] text-white shadow'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            <span className={`rounded-full px-1.5 py-0.5 text-xs ${tab === key ? 'bg-white/20' : 'bg-white/10'}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--text-secondary)]" />
        </div>
      ) : currentList.length === 0 ? (
        <AdminEmptyState
          icon={Zap}
          title="Нет активных подписок"
          description={
            tab === 'workers'
              ? 'Ни один работник не имеет платного тарифа'
              : 'Ни один работодатель не имеет платного тарифа'
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                  {tab === 'workers' ? 'Работник' : 'Компания'}
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                  Тариф
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                  Действует до
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                  Выдано
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                  Источник
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {tab === 'workers'
                ? (workers as WorkerSub[]).map((sub) => (
                    <tr key={sub.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/20">
                            <User className="h-4 w-4 text-[var(--accent)]" />
                          </div>
                          <span className="font-medium text-[var(--text-primary)]">
                            {sub.worker.firstName} {sub.worker.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${PLAN_COLORS[sub.plan] ?? 'text-white bg-white/10 border-white/20'}`}>
                          <Crown className="h-3 w-3" />
                          {PLAN_LABELS[sub.plan] ?? sub.plan}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                          <Calendar className="h-3.5 w-3.5" />
                          {fmtDate(sub.currentPeriodEnd)}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[var(--text-secondary)]">
                        {fmtDate(sub.createdAt)}
                      </td>
                      <td className="px-5 py-4">
                        {sub.grantedByAdmin ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/15 px-2.5 py-0.5 text-xs font-medium text-purple-400">
                            <CheckCircle className="h-3 w-3" /> Администратор
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2.5 py-0.5 text-xs font-medium text-blue-400">
                            Оплата
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                : (employers as EmployerSub[]).map((sub) => (
                    <tr key={sub.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                            <Building2 className="h-4 w-4 text-emerald-400" />
                          </div>
                          <div>
                            <p className="font-medium text-[var(--text-primary)]">
                              {sub.employer.companyName ?? sub.employer.contactName ?? '—'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${PLAN_COLORS[sub.plan] ?? 'text-white bg-white/10 border-white/20'}`}>
                          <Crown className="h-3 w-3" />
                          {PLAN_LABELS[sub.plan] ?? sub.plan}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                          <Calendar className="h-3.5 w-3.5" />
                          {fmtDate(sub.currentPeriodEnd)}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[var(--text-secondary)]">
                        {fmtDate(sub.createdAt)}
                      </td>
                      <td className="px-5 py-4">
                        {sub.grantedByAdmin ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/15 px-2.5 py-0.5 text-xs font-medium text-purple-400">
                            <CheckCircle className="h-3 w-3" /> Администратор
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2.5 py-0.5 text-xs font-medium text-blue-400">
                            Оплата
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Grant modal */}
      {showModal && (
        <GrantModal
          onClose={() => setShowModal(false)}
          onGranted={load}
        />
      )}
    </div>
  );
}
