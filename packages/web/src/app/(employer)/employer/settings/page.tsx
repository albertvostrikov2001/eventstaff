'use client';

import { ChangePasswordForm } from '@/components/settings/ChangePasswordForm';
import { Button } from '@/components/ui/button';

export default function EmployerSettingsPage() {
  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-bold text-white/90">Настройки</h1>
        <p className="mt-1 text-sm text-white/50">Безопасность аккаунта</p>
      </section>

      <section className="rounded-[14px] border border-white/[0.08] bg-white/[0.04] p-6">
        <h2 className="mb-4 text-lg font-semibold text-white/90">Смена пароля</h2>
        <ChangePasswordForm />
      </section>

      <section className="rounded-[14px] border border-white/[0.08] bg-white/[0.04] p-6 opacity-50">
        <h2 className="mb-2 text-lg font-semibold text-white/90">Удаление аккаунта</h2>
        <Button type="button" disabled>
          Удалить аккаунт
        </Button>
        <p className="mt-2 text-xs text-white/40">Для удаления аккаунта свяжитесь с поддержкой</p>
      </section>
    </div>
  );
}
