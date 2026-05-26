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
  emailChatMessage: boolean;
}

const ROWS: { key: keyof Prefs; label: string }[] = [
  { key: 'emailChatMessage', label: 'Новые сообщения в чате' },
  { key: 'emailInvitation', label: 'Приглашения на вакансии' },
  { key: 'emailApplicationReply', label: 'Ответы на ваши отклики' },
  { key: 'emailCancellation', label: 'Отмены смен и откликов' },
  { key: 'emailReview', label: 'Отзывы и оценки' },
  { key: 'emailComplaint', label: 'Жалобы и обращения' },
  { key: 'emailNewApplication', label: 'Новые отклики' },
];

export default function WorkerNotificationSettingsPage() {
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
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-card border border-white/5 bg-white/5" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-white">Уведомления по email</h1>
      <p className="mt-2 text-sm text-white/50">
        Выберите категории писем. In-app уведомления остаются доступны всегда.
      </p>

      <ul className="mt-8 divide-y divide-white/5 rounded-card border border-white/10 bg-white/[0.04]">
        {ROWS.map((row) => (
          <li key={row.key} className="flex items-center justify-between gap-4 px-4 py-4">
            <label htmlFor={row.key} className="cursor-pointer text-sm text-white/80">
              {row.label}
            </label>
            <button
              type="button"
              id={row.key}
              role="switch"
              aria-checked={prefs[row.key]}
              onClick={() => toggle(row.key)}
              className={`relative inline-flex h-7 w-12 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-transparent ${
                prefs[row.key] ? 'bg-primary-500' : 'bg-white/20'
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
