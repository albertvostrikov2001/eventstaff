'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { BanDialog } from '@/components/admin/BanDialog';
import { UnrestrictDialog } from '@/components/admin/UnrestrictDialog';
import { RestrictDialog } from '@/components/admin/RestrictDialog';
import { ConfirmActionDialog } from '@/components/admin/ConfirmActionDialog';
import {
  ShieldCheck,
  Shield,
  Eye,
  EyeOff,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Ban,
  CheckCircle,
  AlertTriangle,
  FileText,
  Mail,
  Users,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';

interface UserItem {
  id: string;
  email: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
  roles: { role: string }[];
  workerProfile: {
    id: string;
    firstName: string;
    lastName: string;
    photoUrl: string | null;
    visibility: string;
    isVerified?: boolean;
  } | null;
  employerProfile: {
    id: string;
    companyName: string | null;
    contactName: string | null;
    logoUrl: string | null;
    isVerified: boolean;
    isHidden: boolean;
  } | null;
  userReliabilityScore: { isRestricted: boolean; strikeCount: number } | null;
}

interface Meta {
  total: number;
  page: number;
  totalPages: number;
}

const ROLE_FILTERS = ['', 'worker', 'employer', 'admin'];
const ROLE_LABELS: Record<string, string> = {
  '': 'Все',
  worker: 'Специалисты',
  employer: 'Работодатели',
  admin: 'Администраторы',
};

function StatusBadge({ user }: { user: UserItem }) {
  if (user.status === 'banned') {
    return (
      <span className="inline-flex items-center gap-1 rounded-badge bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-300">
        <Ban className="h-3 w-3" /> Забанен
      </span>
    );
  }
  if (user.userReliabilityScore?.isRestricted) {
    return (
      <span className="inline-flex items-center gap-1 rounded-badge bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-300">
        <AlertTriangle className="h-3 w-3" /> Ограничен
      </span>
    );
  }
  if (user.employerProfile?.isVerified || user.workerProfile?.isVerified) {
    return (
      <span className="inline-flex items-center gap-1 rounded-badge bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-300">
        <CheckCircle className="h-3 w-3" /> Верифицирован
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-badge bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-300">
      <CheckCircle className="h-3 w-3" /> Активен
    </span>
  );
}

function ActionsMenu({
  user,
  onBan,
  onUnban,
  onRestrict,
  onUnrestrict,
  onVerify,
  onToggleVisibility,
  onToggleEmployerVisibility,
  onOpenChat,
}: {
  user: UserItem;
  onBan: () => void;
  onUnban: () => void;
  onRestrict: () => void;
  onUnrestrict: () => void;
  onVerify: () => void;
  onToggleVisibility: () => void;
  onToggleEmployerVisibility: () => void;
  onOpenChat: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-full p-1.5 text-white/40 hover:bg-white/[0.08] hover:text-white/80"
        aria-label="Действия"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-1 w-52 rounded-card border border-white/10 bg-[#122a1e] py-1 shadow-xl">
          {/* Verify / visibility quick actions */}
          {user.employerProfile && (
            <button
              onClick={() => { close(); onVerify(); }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-white/70 hover:bg-white/[0.06] hover:text-white"
            >
              {user.employerProfile.isVerified ? (
                <><Shield className="h-4 w-4 text-white/40" /> Снять верификацию</>
              ) : (
                <><ShieldCheck className="h-4 w-4 text-green-400" /> Верифицировать</>
              )}
            </button>
          )}
          {user.workerProfile && (
            <button
              onClick={() => { close(); onToggleVisibility(); }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-white/70 hover:bg-white/[0.06] hover:text-white"
            >
              {user.workerProfile.visibility === 'public' ? (
                <><EyeOff className="h-4 w-4 text-white/40" /> Скрыть анкету</>
              ) : (
                <><Eye className="h-4 w-4 text-white/40" /> Показать анкету</>
              )}
            </button>
          )}
          {user.employerProfile && (
            <button
              onClick={() => { close(); onToggleEmployerVisibility(); }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-white/70 hover:bg-white/[0.06] hover:text-white"
            >
              {user.employerProfile.isHidden ? (
                <><Eye className="h-4 w-4 text-white/40" /> Показать работодателя</>
              ) : (
                <><EyeOff className="h-4 w-4 text-white/40" /> Скрыть работодателя</>
              )}
            </button>
          )}

          {/* Открыть анкету (админ видит даже скрытые профили) */}
          {user.workerProfile && (
            <a
              href={`/workers/${user.workerProfile.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-white/70 hover:bg-white/[0.06] hover:text-white"
            >
              <ExternalLink className="h-4 w-4 text-white/40" /> Открыть анкету
            </a>
          )}
          {user.employerProfile && (
            <a
              href={`/employers/${user.employerProfile.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-white/70 hover:bg-white/[0.06] hover:text-white"
            >
              <ExternalLink className="h-4 w-4 text-white/40" /> Открыть анкету
            </a>
          )}

          <div className="my-1 border-t border-white/[0.08]" />

          {/* Start chat */}
          {(user.workerProfile || user.employerProfile) && (
            <button
              onClick={() => { close(); onOpenChat(); }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-white/70 hover:bg-white/[0.06] hover:text-white"
            >
              <MessageSquare className="h-4 w-4 text-emerald-400" /> Написать в чат
            </button>
          )}

          {/* Quick links */}
          <a
            href={`/admin/complaints?userId=${user.id}`}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-white/70 hover:bg-white/[0.06] hover:text-white"
          >
            <FileText className="h-4 w-4 text-white/40" /> Жалобы пользователя
          </a>
          <a
            href={`/admin/email-logs?userId=${user.id}`}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-white/70 hover:bg-white/[0.06] hover:text-white"
          >
            <Mail className="h-4 w-4 text-white/40" /> Email-логи
          </a>

          <div className="my-1 border-t border-white/[0.08]" />

          {/* Ban / Unban / Unrestrict */}
          {user.status === 'banned' ? (
            <button
              onClick={() => { close(); onUnban(); }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm font-medium text-green-400 hover:bg-green-500/10"
            >
              <CheckCircle className="h-4 w-4" /> Разбанить
            </button>
          ) : (
            <button
              onClick={() => { close(); onBan(); }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10"
            >
              <Ban className="h-4 w-4" /> Забанить
            </button>
          )}

          {user.userReliabilityScore?.isRestricted ? (
            <button
              onClick={() => { close(); onUnrestrict(); }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/10"
            >
              <AlertTriangle className="h-4 w-4" /> Снять ограничения
            </button>
          ) : (
            <button
              onClick={() => { close(); onRestrict(); }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/10"
            >
              <AlertTriangle className="h-4 w-4" /> Наложить ограничение
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Dialog state
  const [banTarget, setBanTarget] = useState<UserItem | null>(null);
  const [unbanTarget, setUnbanTarget] = useState<UserItem | null>(null);
  const [unrestrictTarget, setUnrestrictTarget] = useState<UserItem | null>(null);
  const [restrictTarget, setRestrictTarget] = useState<UserItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = () => {
    setLoading(true);
    const params: Record<string, string | number | boolean | undefined> = {
      page,
      ...(roleFilter ? { role: roleFilter } : {}),
      ...(search ? { search } : {}),
    };
    apiClient
      .get<{ data: UserItem[]; meta: Meta }>('/admin/users', params)
      .then((res) => {
        setUsers(res.data);
        setMeta(res.meta!);
      })
      .catch(() => toast('Ошибка загрузки пользователей', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [roleFilter, page, search, toast]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const updateUser = (updated: Partial<UserItem> & { id: string }) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
  };

  const toggleVerify = async (user: UserItem) => {
    if (!user.employerProfile) return;
    const current = user.employerProfile.isVerified;
    try {
      await apiClient.patch(`/admin/employers/${user.employerProfile.id}/verify`, {
        isVerified: !current,
      });
      updateUser({
        id: user.id,
        employerProfile: { ...user.employerProfile, isVerified: !current },
      });
      toast(!current ? 'Работодатель верифицирован' : 'Верификация снята', 'success');
    } catch {
      toast('Ошибка обновления', 'error');
    }
  };

  const toggleVisibility = async (user: UserItem) => {
    if (!user.workerProfile) return;
    const current = user.workerProfile.visibility;
    const newVis = current === 'public' ? 'hidden' : 'public';
    try {
      await apiClient.patch(`/admin/workers/${user.workerProfile.id}/visibility`, {
        visibility: newVis,
      });
      updateUser({
        id: user.id,
        workerProfile: { ...user.workerProfile, visibility: newVis },
      });
      toast('Видимость обновлена', 'success');
    } catch {
      toast('Ошибка обновления', 'error');
    }
  };

  const toggleEmployerVisibility = async (user: UserItem) => {
    if (!user.employerProfile) return;
    const next = !user.employerProfile.isHidden;
    try {
      await apiClient.patch(`/admin/employers/${user.employerProfile.id}/visibility`, {
        isHidden: next,
      });
      updateUser({
        id: user.id,
        employerProfile: { ...user.employerProfile, isHidden: next },
      });
      toast(next ? 'Работодатель скрыт из каталога' : 'Работодатель показан в каталоге', 'success');
    } catch {
      toast('Ошибка обновления', 'error');
    }
  };

  const handleBanConfirm = async (reason: string) => {
    if (!banTarget) return;
    setActionLoading(true);
    try {
      const res = await apiClient.patch<{ data: { status: string } }>(
        `/admin/users/${banTarget.id}/ban`,
        { reason },
      );
      updateUser({ id: banTarget.id, status: res.data.status });
      toast('Пользователь заблокирован', 'success');
      setBanTarget(null);
    } catch {
      toast('Ошибка блокировки', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnban = async (user: UserItem) => {
    setUnbanTarget(null);
    setActionLoading(true);
    try {
      const res = await apiClient.patch<{ data: { status: string } }>(
        `/admin/users/${user.id}/unban`,
        {},
      );
      updateUser({ id: user.id, status: res.data.status });
      toast('Пользователь разбанен', 'success');
    } catch {
      toast('Ошибка разбана', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnrestrictConfirm = async (reason: string) => {
    if (!unrestrictTarget) return;
    setActionLoading(true);
    try {
      await apiClient.patch(`/admin/users/${unrestrictTarget.id}/unrestrict`, { reason });
      updateUser({
        id: unrestrictTarget.id,
        userReliabilityScore: unrestrictTarget.userReliabilityScore
          ? { ...unrestrictTarget.userReliabilityScore, isRestricted: false, strikeCount: 0 }
          : null,
      });
      toast('Ограничения сняты', 'success');
      setUnrestrictTarget(null);
    } catch {
      toast('Ошибка снятия ограничений', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestrictConfirm = async (reason: string) => {
    if (!restrictTarget) return;
    setActionLoading(true);
    try {
      await apiClient.patch(`/admin/users/${restrictTarget.id}/restrict`, { reason });
      updateUser({
        id: restrictTarget.id,
        userReliabilityScore: restrictTarget.userReliabilityScore
          ? { ...restrictTarget.userReliabilityScore, isRestricted: true }
          : { isRestricted: true, strikeCount: 0 },
      });
      toast('Ограничение наложено', 'success');
      setRestrictTarget(null);
    } catch {
      toast('Ошибка наложения ограничения', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenChat = async (user: UserItem) => {
    try {
      const res = await apiClient.post<{ data: { roomId: string } }>(
        `/admin/users/${user.id}/open-chat`,
        {},
      );
      router.push(`/admin/messages/${res.data.roomId}`);
    } catch {
      toast('Не удалось открыть чат', 'error');
    }
  };

  const getUserDisplayName = (u: UserItem) =>
    u.workerProfile
      ? `${u.workerProfile.firstName} ${u.workerProfile.lastName}`.trim() || '—'
      : u.employerProfile?.companyName ?? u.employerProfile?.contactName ?? '—';

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-white">Пользователи</h1>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени или email..."
            className="w-full rounded-input border border-white/15 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
          />
        </form>
        <div className="flex flex-wrap gap-1">
          {ROLE_FILTERS.map((r) => (
            <button
              key={r}
              onClick={() => {
                setRoleFilter(r);
                setPage(1);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                roleFilter === r
                  ? 'bg-primary-500 text-white'
                  : 'border border-white/15 bg-transparent text-white/60 hover:border-white/25 hover:text-white/90'
              }`}
            >
              {ROLE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-card border border-white/10 bg-white/[0.04]">
        <table className="min-w-full divide-y divide-white/[0.06]">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/50">
                Пользователь
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/50">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/50">
                Роли
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/50">
                Статус
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/50">
                Дата
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/50">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(6)].map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="skeleton-dark h-4 w-24" />
                    </td>
                  ))}
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-4">
                  <AdminEmptyState
                    icon={Users}
                    title="Пользователи не найдены"
                    description="Попробуйте изменить фильтры или поисковый запрос"
                  />
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const displayName = getUserDisplayName(u);
                return (
                  <tr
                    key={u.id}
                    className={`transition-colors hover:bg-white/[0.05] ${u.status === 'banned' ? 'bg-red-500/5' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-white">{displayName}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-white/60">
                      {u.email ?? u.phone ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((r) => (
                          <span
                            key={r.role}
                            className="rounded-badge bg-white/[0.08] px-2 py-0.5 text-xs text-white/70"
                          >
                            {r.role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge user={u} />
                    </td>
                    <td className="px-4 py-3 text-xs text-white/50">
                      {new Date(u.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-4 py-3">
                      <ActionsMenu
                        user={u}
                        onBan={() => setBanTarget(u)}
                        onUnban={() => setUnbanTarget(u)}
                        onRestrict={() => setRestrictTarget(u)}
                        onUnrestrict={() => setUnrestrictTarget(u)}
                        onVerify={() => toggleVerify(u)}
                        onToggleVisibility={() => toggleVisibility(u)}
                        onToggleEmployerVisibility={() => toggleEmployerVisibility(u)}
                        onOpenChat={() => handleOpenChat(u)}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-white/50">{meta.total} пользователей</span>
        <div className="flex items-center gap-2 text-white/70">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-full p-1.5 hover:bg-white/[0.08] disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm">
            {page} / {meta.totalPages}
          </span>
          <button
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-full p-1.5 hover:bg-white/[0.08] disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Ban Dialog */}
      <BanDialog
        open={!!banTarget}
        userName={banTarget ? getUserDisplayName(banTarget) : ''}
        loading={actionLoading}
        onConfirm={handleBanConfirm}
        onCancel={() => setBanTarget(null)}
      />

      {/* Unban Confirm Dialog */}
      <ConfirmActionDialog
        open={!!unbanTarget}
        title="Разбанить пользователя"
        description={
          unbanTarget
            ? `Восстановить доступ для «${getUserDisplayName(unbanTarget)}»?`
            : ''
        }
        confirmLabel="Разбанить"
        variant="warning"
        loading={actionLoading}
        onConfirm={() => unbanTarget && handleUnban(unbanTarget)}
        onCancel={() => setUnbanTarget(null)}
      />

      {/* Unrestrict Dialog */}
      <UnrestrictDialog
        open={!!unrestrictTarget}
        userName={unrestrictTarget ? getUserDisplayName(unrestrictTarget) : ''}
        loading={actionLoading}
        onConfirm={handleUnrestrictConfirm}
        onCancel={() => setUnrestrictTarget(null)}
      />

      {/* Restrict Dialog */}
      <RestrictDialog
        open={!!restrictTarget}
        userName={restrictTarget ? getUserDisplayName(restrictTarget) : ''}
        loading={actionLoading}
        onConfirm={handleRestrictConfirm}
        onCancel={() => setRestrictTarget(null)}
      />
    </div>
  );
}
