'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { ShieldCheck, Shield, Eye, EyeOff, Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface UserItem {
  id: string;
  email: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
  roles: { role: string }[];
  workerProfile: { id: string; firstName: string; lastName: string; photoUrl: string | null; visibility: string } | null;
  employerProfile: { id: string; companyName: string | null; contactName: string | null; logoUrl: string | null; isVerified: boolean } | null;
}

interface Meta {
  total: number;
  page: number;
  totalPages: number;
}

const ROLE_FILTERS = ['', 'worker', 'employer', 'admin'];
const ROLE_LABELS: Record<string, string> = { '': 'Все', worker: 'Специалисты', employer: 'Работодатели', admin: 'Администраторы' };

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

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

  useEffect(load, [roleFilter, page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const toggleVerify = async (employerProfileId: string, current: boolean) => {
    try {
      await apiClient.patch(`/admin/employers/${employerProfileId}/verify`, {
        isVerified: !current,
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.employerProfile?.id === employerProfileId
            ? { ...u, employerProfile: { ...u.employerProfile!, isVerified: !current } }
            : u,
        ),
      );
      toast(!current ? 'Работодатель верифицирован' : 'Верификация снята', 'success');
    } catch {
      toast('Ошибка обновления', 'error');
    }
  };

  const toggleVisibility = async (workerProfileId: string, current: string) => {
    const newVis = current === 'public' ? 'hidden' : 'public';
    try {
      await apiClient.patch(`/admin/workers/${workerProfileId}/visibility`, {
        visibility: newVis,
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.workerProfile?.id === workerProfileId
            ? { ...u, workerProfile: { ...u.workerProfile!, visibility: newVis } }
            : u,
        ),
      );
      toast('Видимость обновлена', 'success');
    } catch {
      toast('Ошибка обновления', 'error');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Пользователи</h1>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени или email..."
            className="w-full rounded-input border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </form>
        <div className="flex gap-1">
          {ROLE_FILTERS.map((r) => (
            <button
              key={r}
              onClick={() => { setRoleFilter(r); setPage(1); }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                roleFilter === r
                  ? 'bg-primary-500 text-white'
                  : 'border border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              {ROLE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-card border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Пользователь</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Роли</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Статус</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Дата</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(6)].map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              users.map((u) => {
                const displayName = u.workerProfile
                  ? `${u.workerProfile.firstName} ${u.workerProfile.lastName}`.trim()
                  : u.employerProfile?.companyName
                  ?? u.employerProfile?.contactName
                  ?? '—';
                return (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-900">{displayName}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{u.email ?? u.phone ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {u.roles.map((r) => (
                          <span key={r.role} className="rounded-badge bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                            {r.role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-badge px-2 py-0.5 text-xs font-medium ${
                        u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(u.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {u.employerProfile && (
                          <button
                            onClick={() => toggleVerify(u.employerProfile!.id, u.employerProfile!.isVerified)}
                            title={u.employerProfile.isVerified ? 'Снять верификацию' : 'Верифицировать'}
                            className={`rounded-full p-1.5 transition ${
                              u.employerProfile.isVerified
                                ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                            }`}
                          >
                            {u.employerProfile.isVerified ? <ShieldCheck className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                          </button>
                        )}
                        {u.workerProfile && (
                          <button
                            onClick={() => toggleVisibility(u.workerProfile!.id, u.workerProfile!.visibility)}
                            title={u.workerProfile.visibility === 'public' ? 'Скрыть анкету' : 'Показать анкету'}
                            className="rounded-full bg-gray-100 p-1.5 text-gray-400 hover:bg-gray-200"
                          >
                            {u.workerProfile.visibility === 'public' ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-gray-500">{meta.total} пользователей</span>
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-full p-1.5 hover:bg-gray-100 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-gray-500">{page} / {meta.totalPages}</span>
          <button
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-full p-1.5 hover:bg-gray-100 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
