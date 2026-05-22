'use client';

import { useState } from 'react';
import { z } from 'zod';
import { apiClient, ApiError } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { Button } from '@/components/ui/button';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Введите текущий пароль'),
    newPassword: z.string().min(8, 'Минимум 8 символов'),
    confirmPassword: z.string().min(1, 'Подтвердите пароль'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  });

export function ChangePasswordForm() {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = schema.safeParse({ currentPassword, newPassword, confirmPassword });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Проверьте поля');
      return;
    }
    setBusy(true);
    try {
      await apiClient.patch('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      toast('Пароль изменён. Войдите снова.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      window.location.href = '/auth/login';
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Не удалось сменить пароль';
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="max-w-md space-y-4">
      <div>
        <label className="mb-1 block text-sm text-white/65">Текущий пароль *</label>
        <input
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full rounded-input border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-white/65">Новый пароль *</label>
        <input
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full rounded-input border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-white/65">Подтвердите пароль *</label>
        <input
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded-input border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white"
        />
      </div>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <Button type="submit" variant="primary" disabled={busy}>
        {busy ? 'Сохраняем…' : 'Сменить пароль'}
      </Button>
    </form>
  );
}
