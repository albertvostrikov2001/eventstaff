'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { Mail, ChevronLeft, ChevronRight, MessageSquare, MessageCircle, CheckCheck, Clock } from 'lucide-react';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';

type ContactReq = {
  id: string;
  name: string;
  email: string;
  message: string;
  status: 'new' | 'read' | 'replied';
  adminNote: string | null;
  createdAt: string;
  chatUserId: string | null;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: 'Новое', color: 'bg-yellow-100 text-yellow-800' },
  read: { label: 'Прочитано', color: 'bg-blue-100 text-blue-800' },
  replied: { label: 'Отвечено', color: 'bg-green-100 text-green-800' },
};

export default function AdminContactRequestsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [rows, setRows] = useState<ContactReq[]>([]);
  const [openingChat, setOpeningChat] = useState<string | null>(null);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (filterStatus) params.set('status', filterStatus);
      const res = await apiClient.get<{ data: ContactReq[]; meta: typeof meta }>(
        `/admin/contact-requests?${params}`,
      );
      setRows(res.data);
      setMeta(res.meta ?? { page: 1, totalPages: 1, total: 0 });
    } catch {
      toast('Не удалось загрузить обращения', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, toast]);

  useEffect(() => { void load(); }, [load]);

  const openChat = async (id: string) => {
    setOpeningChat(id);
    try {
      const res = await apiClient.post<{ data: { roomId: string } }>(
        `/admin/contact-requests/${id}/open-chat`,
        {},
      );
      router.push(`/admin/messages/${res.data.roomId}`);
    } catch {
      toast('Не удалось открыть чат', 'error');
      setOpeningChat(null);
    }
  };

  const updateStatus = async (id: string, status: string, note?: string) => {
    setSaving(id);
    try {
      await apiClient.patch(`/admin/contact-requests/${id}`, {
        status,
        ...(note !== undefined ? { adminNote: note } : {}),
      });
      toast('Сохранено', 'success');
      void load();
    } catch {
      toast('Ошибка сохранения', 'error');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white">Обращения с сайта</h1>
          <p className="mt-0.5 text-sm text-white/50">
            Сообщения из формы обратной связи на странице /contacts
          </p>
        </div>
        <span className="shrink-0 text-sm text-white/40">{meta.total} обращений</span>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {[['', 'Все'], ['new', 'Новые'], ['read', 'Прочитанные'], ['replied', 'Отвеченные']].map(
          ([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => { setFilterStatus(val); setPage(1); }}
              className={`rounded-input border px-3 py-1.5 text-xs font-medium transition ${
                filterStatus === val
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                  : 'border-white/15 text-white/60 hover:border-white/30'
              }`}
            >
              {label}
            </button>
          ),
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-[10px] bg-white/[0.04]" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <AdminEmptyState icon={Mail} title="Обращений нет" />
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const st = STATUS_LABELS[row.status] ?? STATUS_LABELS['new'];
            const isOpen = expanded === row.id;
            const note = noteInputs[row.id] ?? row.adminNote ?? '';
            return (
              <div
                key={row.id}
                className="rounded-[12px] border border-white/[0.08] bg-white/[0.04]"
              >
                {/* Header row */}
                <button
                  type="button"
                  onClick={() => {
                    setExpanded(isOpen ? null : row.id);
                    if (!isOpen && row.status === 'new') {
                      void updateStatus(row.id, 'read');
                    }
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <MessageSquare className="h-4 w-4 shrink-0 text-white/40" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white truncate">{row.name}</span>
                      <span className="text-xs text-white/50">{row.email}</span>
                      {row.status === 'new' && (
                        <span className="inline-flex h-2 w-2 rounded-full bg-yellow-400" />
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-white/40 truncate">{row.message}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className={`rounded-badge px-2 py-0.5 text-xs font-medium ${st.color}`}>
                      {st.label}
                    </span>
                    <span className="text-xs text-white/30">
                      {new Date(row.createdAt).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <div className="border-t border-white/[0.06] px-4 py-4 space-y-4">
                    <div>
                      <p className="text-xs font-medium text-white/50 mb-1">Сообщение</p>
                      <p className="text-sm text-white/90 whitespace-pre-wrap">{row.message}</p>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-white/50 mb-1 block">
                        Заметка администратора
                      </label>
                      <textarea
                        rows={2}
                        value={note}
                        onChange={(e) =>
                          setNoteInputs((prev) => ({ ...prev, [row.id]: e.target.value }))
                        }
                        placeholder="Ваши пометки..."
                        className="w-full resize-none rounded-input border border-white/15 bg-white/[0.06] px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-emerald-500/50"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {row.chatUserId ? (
                        <button
                          type="button"
                          disabled={openingChat === row.id}
                          onClick={() => void openChat(row.id)}
                          className="inline-flex items-center gap-1.5 rounded-input border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          {openingChat === row.id ? 'Открываем…' : 'Перейти в чат'}
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-input border border-white/10 px-3 py-1.5 text-xs text-white/35">
                          Не зарегистрирован — чат недоступен
                        </span>
                      )}
                      <a
                        href={`mailto:${row.email}?subject=Ответ на ваше обращение`}
                        className="inline-flex items-center gap-1.5 rounded-input border border-white/15 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/[0.06]"
                        onClick={() => {
                          if (row.status !== 'replied') void updateStatus(row.id, 'replied', note);
                        }}
                      >
                        <Mail className="h-3.5 w-3.5" />
                        Ответить по email
                      </a>
                      <button
                        type="button"
                        disabled={saving === row.id}
                        onClick={() => void updateStatus(row.id, 'replied', note)}
                        className="inline-flex items-center gap-1.5 rounded-input border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        Пометить как отвеченное
                      </button>
                      {row.status !== 'read' && row.status !== 'replied' && (
                        <button
                          type="button"
                          disabled={saving === row.id}
                          onClick={() => void updateStatus(row.id, 'read', note)}
                          className="inline-flex items-center gap-1.5 rounded-input border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-300 hover:bg-blue-500/20 disabled:opacity-50"
                        >
                          <Clock className="h-3.5 w-3.5" />
                          Прочитано
                        </button>
                      )}
                      {note !== (row.adminNote ?? '') && (
                        <button
                          type="button"
                          disabled={saving === row.id}
                          onClick={() => void updateStatus(row.id, row.status, note)}
                          className="inline-flex items-center gap-1.5 rounded-input border border-white/15 px-3 py-1.5 text-xs font-medium text-white/70 hover:bg-white/[0.06] disabled:opacity-50"
                        >
                          Сохранить заметку
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-full border border-white/15 p-1.5 text-white/60 hover:bg-white/[0.06] disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-white/50">
            {page} / {meta.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-full border border-white/15 p-1.5 text-white/60 hover:bg-white/[0.06] disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
