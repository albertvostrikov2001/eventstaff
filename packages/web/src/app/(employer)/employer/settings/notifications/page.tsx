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
  { key: 'emailNewApplication', label: 'Новые отклики на вакансии' },
  { key: 'emailInvitation', label: 'Приглашения' },
  { key: 'emailCancellation', label: 'Отмены смен и откликов' },
  { key: 'emailReview', label: 'Отзывы и оценки' },
  { key: 'emailComplaint', label: 'Жалобы и обращения' },
  { key: 'emailApplicationReply', label: 'Ответы на ваши запросы' },
];

export default function EmployerNotificationSettingsPage() {
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
          <div
            key={i}
            className="h-14 animate-pulse rounded-[14px] border border-white/[0.06] bg-white/[0.06]"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-8 pb-10">
      <header>
        <h1 className="text-2xl font-bold text-white">Уведомления по email</h1>
        <p className="mt-1 text-sm text-white/55">
          Выберите категории писем. Уведомления в кабинете остаются без изменений.
        </p>
      </header>

      <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-[14px] border border-white/[0.08] bg-white/[0.04]">
        {ROWS.map(row => (
          <li key={row.key} className="flex items-center justify-between gap-4 px-4 py-4">
            <label htmlFor={row.key} className="cursor-pointer text-sm font-medium text-white/85">
              {row.label}
            </label>
            <button
              type="button"
              id={row.key}
              role="switch"
              aria-checked={prefs[row.key]}
              onClick={() => toggle(row.key)}
              className={`relative inline-flex h-7 w-12 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:shadow-[0_0_0_3px_rgba(45,106,74,0.35)] ${
                prefs[row.key] ? 'bg-[color:var(--u-emerald,#2d6a4a)]' : 'bg-white/15'
              }`}
            >
              <span
                className={`pointer-events-none ml-px mt-px inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${
                  prefs[row.key] ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </li>
        ))}
      </ul>

      <div>
        <Button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          variant="primary"
          size="lg"
          className="rounded-[10px]"
        >
          {saving ? 'Сохранение…' : 'Сохранить'}
        </Button>
      </div>
    </div>
  );
}
