'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiClient, ApiError } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';

type Req = {
  id: string;
  role: string;
  name: string;
  phone: string;
  email: string;
  company: string | null;
  eventType: string | null;
  eventDate: string | null;
  staffNeeded: string | null;
  quantity: number | null;
  position: string | null;
  experience: string | null;
  availability: string | null;
  message: string;
  status: string;
  adminComment: string | null;
  createdAt: string;
};

const STATUS_OPTS = ['NEW', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'];

export function IndividualRequestDetailPageClient() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [row, setRow] = useState<Req | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('NEW');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiClient
      .get<{ data: Req }>(`/admin/individual-requests/${id}`)
      .then((r) => {
        setRow(r.data);
        setStatus(r.data.status);
        setComment(r.data.adminComment ?? '');
      })
      .catch(() => toast('Не найдено', 'error'))
      .finally(() => setLoading(false));
  }, [id, toast]);

  const save = async () => {
    setSaving(true);
    try {
      const d = await apiClient.patch<{ data: Req }>(`/admin/individual-requests/${id}`, {
        status,
        adminComment: comment,
      });
      setRow(d.data);
      toast('Сохранено', 'success');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Ошибка', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !row) {
    return <p className="text-white/60">Загрузка…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 text-sm text-white/60">
        <Link href="/admin/individual-requests" className="hover:text-white">
          ← Список
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-white">Заявка {row.id.slice(0, 8)}…</h1>
      <div className="rounded-input border border-white/10 bg-white/[0.04] p-4 text-sm text-white/90">
        <dl className="grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="text-white/50">Роль</dt>
            <dd>{row.role}</dd>
          </div>
          <div>
            <dt className="text-white/50">Статус</dt>
            <dd>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-0.5 rounded border border-white/15 bg-white/5 px-2 py-1 text-white"
              >
                {STATUS_OPTS.map((s) => (
                  <option key={s} value={s} className="bg-gray-900">
                    {s}
                  </option>
                ))}
              </select>
            </dd>
          </div>
          <div>
            <dt className="text-white/50">Имя</dt>
            <dd>{row.name}</dd>
          </div>
          <div>
            <dt className="text-white/50">Контакты</dt>
            <dd>
              {row.phone} / {row.email}
            </dd>
          </div>
          {row.company && (
            <div>
              <dt className="text-white/50">Компания</dt>
              <dd>{row.company}</dd>
            </div>
          )}
          {row.eventType && (
            <div>
              <dt className="text-white/50">Тип мероприятия</dt>
              <dd>{row.eventType}</dd>
            </div>
          )}
          {row.eventDate && (
            <div>
              <dt className="text-white/50">Дата</dt>
              <dd>{new Date(row.eventDate).toLocaleDateString('ru-RU')}</dd>
            </div>
          )}
          {row.staffNeeded && (
            <div>
              <dt className="text-white/50">Персонал</dt>
              <dd>{row.staffNeeded}</dd>
            </div>
          )}
          {row.position && (
            <div>
              <dt className="text-white/50">Должность</dt>
              <dd>{row.position}</dd>
            </div>
          )}
        </dl>
        {row.experience && (
          <div className="mt-3">
            <p className="text-white/50">Опыт</p>
            <p className="mt-1 whitespace-pre-wrap text-white/90">{row.experience}</p>
          </div>
        )}
        {row.message && (
          <div className="mt-3">
            <p className="text-white/50">Комментарий</p>
            <p className="mt-1 whitespace-pre-wrap text-white/90">{row.message}</p>
          </div>
        )}
        <div className="mt-4">
          <p className="text-white/50">Комментарий администратора</p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="mt-1 w-full max-w-lg rounded border border-white/15 bg-white/5 px-2 py-1.5 text-white"
          />
        </div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="mt-3 rounded-input bg-primary-500/90 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
        >
          Сохранить
        </button>
      </div>
    </div>
  );
}
