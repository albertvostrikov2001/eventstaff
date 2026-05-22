'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { Send, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { ResponsiveTable, type Column } from '@/components/ui/ResponsiveTable';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { formatRelativeTimeRu } from '@/lib/format-relative-ru';

interface Invitation {
  id: string;
  status: string;
  createdAt: string;
  vacancy: { id: string; title: string; dateStart?: string | null };
  worker: { id: string; firstName: string; lastName: string; photoUrl: string | null };
}

interface Meta {
  total: number;
  page: number;
  totalPages: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  invited: { label: 'Ожидает ответа', color: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'Принято', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Отклонено', color: 'bg-red-100 text-red-600' },
  pending: { label: 'Ожидает', color: 'bg-gray-100 text-gray-600' },
};

export default function EmployerInvitationsPage() {
  const { toast } = useToast();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    apiClient
      .get<{ data: Invitation[]; meta: Meta }>('/employer/invitations', { page })
      .then((r) => {
        setInvitations(r.data ?? []);
        if (r.meta) setMeta(r.meta);
      })
      .catch(() => toast('Ошибка загрузки приглашений', 'error'))
      .finally(() => setLoading(false));
  }, [page, toast]);

  const columns = useMemo((): Column<Invitation>[] => {
    return [
      {
        key: 'worker',
        header: 'Работник',
        render: (inv, _i) => {
          const workerName = `${inv.worker.firstName} ${inv.worker.lastName}`.trim() || 'Работник';
          return (
            <div className="flex items-center gap-2.5">
              <UserAvatar src={inv.worker.photoUrl} name={workerName} size={32} />
              <span className="font-medium text-gray-900">{workerName}</span>
            </div>
          );
        },
      },
      {
        key: 'vacancy',
        header: 'Вакансия',
        render: (inv, _i) => (
          <Link href={`/employer/vacancies/${inv.vacancy.id}`} className="text-emerald-700 hover:underline">
            {inv.vacancy.title}
          </Link>
        ),
      },
      {
        key: 'event',
        header: 'Дата события',
        render: (inv, _i) => {
          const dateStr = inv.vacancy.dateStart
            ? new Date(inv.vacancy.dateStart).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
            : '—';
          return (
            <span className="flex items-center gap-1 text-gray-500">
              <Calendar className="h-3.5 w-3.5" aria-hidden />
              {dateStr}
            </span>
          );
        },
      },
      {
        key: 'status',
        header: 'Статус',
        render: (inv, _i) => {
          const st = STATUS_CONFIG[inv.status] ?? { label: inv.status, color: 'bg-gray-100 text-gray-600' };
          return (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.color}`}>{st.label}</span>
          );
        },
      },
      {
        key: 'sent',
        header: 'Отправлено',
        render: (inv, _i) => (
          <span className="text-xs text-gray-400">
            {new Date(inv.createdAt).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'short',
            })}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Действия',
        render: (inv, _i) => (
          <Link
            href={`/workers/${inv.worker.id}`}
            className="text-sm font-medium text-emerald-700 hover:underline"
          >
            Профиль
          </Link>
        ),
      },
    ];
  }, []);

  const mobileCard = useMemo(
    () => ({
      title: (inv: Invitation) => {
        const workerName = `${inv.worker.firstName} ${inv.worker.lastName}`.trim() || 'Работник';
        return <span className="text-gray-900">{workerName}</span>;
      },
      subtitle: (inv: Invitation) => (
        <Link href={`/employer/vacancies/${inv.vacancy.id}`} className="text-emerald-700 hover:underline">
          {inv.vacancy.title}
        </Link>
      ),
      badge: (inv: Invitation) => {
        const st = STATUS_CONFIG[inv.status] ?? { label: inv.status, color: 'bg-gray-100 text-gray-600' };
        return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.color}`}>{st.label}</span>;
      },
      meta: (inv: Invitation) => (
        <span className="text-xs">Отправлено {formatRelativeTimeRu(inv.createdAt)}</span>
      ),
      actions: (inv: Invitation) =>
        inv.status === 'confirmed' ? (
          <Link
            href={`/employer/vacancies/${inv.vacancy.id}/applications`}
            className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-center text-sm font-medium text-white"
          >
            Просмотреть отклики
          </Link>
        ) : (
          <Link
            href={`/workers/${inv.worker.id}`}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 text-center text-sm font-medium text-emerald-700"
          >
            Просмотреть профиль
          </Link>
        ),
    }),
    [],
  );

  return (
    <div>
      <Breadcrumbs
        items={[{ label: 'Кабинет', href: '/employer/dashboard' }, { label: 'Приглашения' }]}
        tone="light"
        className="!mb-4 max-sm:text-xs"
      />
      <h1 className="text-2xl font-bold text-gray-900">Отправленные приглашения</h1>
      <p className="mt-1 text-sm text-gray-500">История прямых приглашений работников на ваши вакансии</p>

      <div className="mt-6">
        <ResponsiveTable
          data={invitations}
          columns={columns}
          mobileCard={mobileCard}
          keyExtractor={(i) => i.id}
          isLoading={loading}
          variant="light"
          emptyState={
            <div className="flex flex-col items-center justify-center rounded-card border border-gray-200 bg-white py-16 text-center">
              <Send className="mb-4 h-12 w-12 text-gray-200" />
              <p className="text-sm text-gray-500">Вы ещё не отправляли приглашений</p>
              <p className="mt-1 text-xs text-gray-400">
                Перейдите в раздел «Найти персонал», чтобы пригласить работника
              </p>
            </div>
          }
        />

        {meta.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-gray-500">{meta.total} приглашений</span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                aria-label="Предыдущая страница"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-500">
                {page} / {meta.totalPages}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Следующая страница"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
