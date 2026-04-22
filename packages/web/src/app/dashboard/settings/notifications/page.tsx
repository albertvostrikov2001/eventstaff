'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { Button } from '@/components/ui/button';

interface Prefs {
  emailInvitation: boolean;
  emailCancellation: boolean;
  emailReview: boolean;
  emailComplaint: boolean;
  emailNewApplication: boolean;
  emailApplicationReply: boolean;
}

const ROWS: { key: keyof Prefs; label: string }[] = [
  { key: 'emailInvitation', label: 'Приглашения на вакансии' },
  { key: 'emailCancellation', label: 'Отмены смен и откликов' },
  { key: 'emailReview', label: 'Отзывы и оценки' },
  { key: 'emailComplaint', label: 'Жалобы и обращения' },
  { key: 'emailNewApplication', label: 'Новые отклики (для работодателя)' },
  { key: 'emailApplicationReply', label: 'Ответы на ваши отклики' },
];

export default function NotificationSettingsPage() {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient
      .get<{ data: Prefs }>('/notifications/preferences')
      .then((res) => setPrefs(res.data))
      .catch(() => toast('Не удалось загрузить настройки', 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

  const toggle = (key: keyof Prefs) => {
    setPrefs((p) => (p ? { ...p, [key]: !p[key] } : p));
  };

  const save = async () => {
    if (!prefs) return;
    setSaving(true);
    try {
      const res = await apiClient.patch<{ data: Prefs }>('/notifications/preferences', prefs);
      setPrefs(res.data);
      toast('Настройки сохранены', 'success');
    } catch {
      toast('Ошибка сохранения', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !prefs) {
    return <p className="text-sm text-gray-500">Загрузка настроек…</p>;
  }

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-2xl font-semibold text-gray-900">Уведомления по email</h1>
      <p className="mt-2 text-sm text-gray-600">
        Выберите категории писем. In-app уведомления в кабинете остаются доступны.
      </p>

      <ul className="mt-8 divide-y divide-gray-200 rounded-card border border-gray-200 bg-white">
        {ROWS.map((row) => (
          <li key={row.key} className="flex items-center justify-between gap-4 px-4 py-4">
            <label htmlFor={row.key} className="cursor-pointer text-sm font-medium text-gray-800">
              {row.label}
            </label>
            <button
              type="button"
              id={row.key}
              role="switch"
              aria-checked={prefs[row.key]}
              onClick={() => toggle(row.key)}
              className={`relative inline-flex h-7 w-12 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                prefs[row.key] ? 'bg-emerald-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${
                  prefs[row.key] ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <Button type="button" onClick={() => void save()} disabled={saving}>
          {saving ? 'Сохранение…' : 'Сохранить'}
        </Button>
      </div>
    </div>
  );
}
