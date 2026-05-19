'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { EmployerLogoMark } from '@/components/employer/EmployerLogoMark';
import {
  Mail,
  Calendar,
  MapPin,
  Banknote,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Invitation {
  id: string;
  status: string;
  createdAt: string;
  vacancy: {
    id: string;
    title: string;
    dateStart?: string | null;
    address?: string | null;
    rate?: number | null;
    rateType?: string | null;
    employer?: {
      companyName?: string | null;
      contactName?: string | null;
      logoUrl?: string | null;
    };
    city?: { name: string } | null;
  };
}

interface Meta {
  total: number;
  page: number;
  totalPages: number;
}

// ─── Decline Modal ──────────────────────────────────────────────────────────

function DeclineModal({
  onConfirm,
  onClose,
  loading,
}: {
  onConfirm: (message: string) => void;
  onClose: () => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 mx-4 w-full max-w-sm rounded-modal border border-white/10 bg-[#0f1f17] p-6 shadow-xl">
        <h3 className="text-base font-semibold text-white">Отклонить приглашение</h3>
        <p className="mt-1 text-sm text-white/50">Причина необязательна, но поможет работодателю.</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Причина (необязательно)..."
          className="mt-4 w-full rounded-input border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-primary-400/50 focus:outline-none"
        />
        <div className="mt-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-input border border-white/20 py-2.5 text-sm text-white/70 hover:border-white/40"
          >
            Назад
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={loading}
            className="flex-1 rounded-input border border-red-500/40 bg-red-950/50 py-2.5 text-sm font-semibold text-red-300 hover:border-red-500/70 disabled:opacity-50"
          >
            {loading ? 'Отклоняем...' : 'Отклонить'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Invitation Card ────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  invited: { label: 'Ожидает ответа', color: 'bg-amber-500/20 text-amber-300' },
  confirmed: { label: 'Принято', color: 'bg-green-500/20 text-green-300' },
  rejected: { label: 'Отклонено', color: 'bg-red-500/20 text-red-300' },
};

function InvitationCard({
  invitation,
  onAccept,
  onDecline,
  acceptingId,
}: {
  invitation: Invitation;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  acceptingId: string | null;
}) {
  const st = STATUS_CONFIG[invitation.status] ?? { label: invitation.status, color: 'bg-gray-100/10 text-gray-400' };
  const v = invitation.vacancy;
  const employer = v.employer;
  const companyName = employer?.companyName ?? employer?.contactName ?? 'Работодатель';
  const isPending = invitation.status === 'invited';

  const dateStr = v.dateStart
    ? new Date(v.dateStart).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  const location = v.address ?? v.city?.name;
  const receivedStr = new Date(invitation.createdAt).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <div className={`rounded-card border bg-white/[0.04] p-5 ${isPending ? 'border-primary-400/30' : 'border-white/[0.08]'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <EmployerLogoMark
            size="sm"
            className="shrink-0 rounded-full"
            roundedClassName="rounded-full"
            logoUrl={employer?.logoUrl ?? null}
            companyName={employer?.companyName ?? null}
            contactName={employer?.contactName ?? null}
          />
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-white">{v.title}</h3>
            <p className="text-sm text-white/60">{companyName}</p>
          </div>
        </div>
        <span className={`shrink-0 rounded-badge px-2.5 py-0.5 text-xs font-medium ${st.color}`}>
          {st.label}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-white/50">
        {dateStr && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> {dateStr}
          </span>
        )}
        {location && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> {location}
          </span>
        )}
        {v.rate && (
          <span className="flex items-center gap-1">
            <Banknote className="h-3.5 w-3.5" /> {Number(v.rate).toLocaleString('ru-RU')} ₽
          </span>
        )}
        <span className="ml-auto">Получено {receivedStr}</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {isPending && (
          <>
            <button
              onClick={() => onAccept(invitation.id)}
              disabled={acceptingId === invitation.id}
              className="flex items-center gap-1.5 rounded-input bg-primary-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              {acceptingId === invitation.id ? 'Принимаем...' : 'Принять'}
            </button>
            <button
              onClick={() => onDecline(invitation.id)}
              disabled={acceptingId === invitation.id}
              className="flex items-center gap-1.5 rounded-input border border-red-500/40 px-4 py-1.5 text-xs font-semibold text-red-300 hover:border-red-500/70"
            >
              <XCircle className="h-3.5 w-3.5" /> Отклонить
            </button>
          </>
        )}
        <Link
          href={`/vacancies/${v.id}`}
          className="ml-auto text-xs text-white/40 hover:text-white/70"
        >
          Посмотреть вакансию →
        </Link>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function WorkerInvitationsPage() {
  const { toast } = useToast();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [declineSaving, setDeclineSaving] = useState(false);

  const loadInvitations = () => {
    setLoading(true);
    apiClient
      .get<{ data: Invitation[]; meta: Meta }>('/worker/applications', { status: 'invited', page })
      .then((r) => {
        setInvitations(r.data ?? []);
        if (r.meta) setMeta(r.meta);
      })
      .catch(() => toast('Ошибка загрузки приглашений', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(loadInvitations, [page]);

  const handleAccept = async (id: string) => {
    setAcceptingId(id);
    try {
      await apiClient.patch(`/worker/applications/${id}/respond`, { action: 'ACCEPT' });
      toast('Приглашение принято. Работодатель получит уведомление.', 'success');
      setInvitations((prev) => prev.map((inv) => (inv.id === id ? { ...inv, status: 'confirmed' } : inv)));
    } catch {
      toast('Ошибка. Попробуйте ещё раз.', 'error');
    } finally {
      setAcceptingId(null);
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
      setInvitations((prev) =>
        prev.map((inv) => (inv.id === decliningId ? { ...inv, status: 'rejected' } : inv)),
      );
      setDecliningId(null);
    } catch {
      toast('Ошибка. Попробуйте ещё раз.', 'error');
    } finally {
      setDeclineSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Приглашения</h1>
      <p className="mt-1 text-sm text-white/50">
        Работодатели могут приглашать вас на вакансии напрямую
      </p>

      <div className="mt-6">
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-card border border-white/5 bg-white/5" />
            ))}
          </div>
        ) : invitations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Mail className="mb-4 h-12 w-12 text-white/20" />
            <p className="text-sm text-white/50">У вас нет приглашений</p>
            <p className="mt-1 text-xs text-white/30">
              Заполните профиль, чтобы работодатели могли вас найти
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {invitations.map((inv) => (
              <InvitationCard
                key={inv.id}
                invitation={inv}
                onAccept={handleAccept}
                onDecline={setDecliningId}
                acceptingId={acceptingId}
              />
            ))}
          </div>
        )}

        {meta.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <span className="text-sm text-white/40">{meta.total} приглашений</span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-full p-1.5 text-white/60 hover:bg-white/10 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-white/50">{page} / {meta.totalPages}</span>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-full p-1.5 text-white/60 hover:bg-white/10 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {decliningId && (
        <DeclineModal
          onConfirm={handleDeclineConfirm}
          onClose={() => setDecliningId(null)}
          loading={declineSaving}
        />
      )}
    </div>
  );
}
