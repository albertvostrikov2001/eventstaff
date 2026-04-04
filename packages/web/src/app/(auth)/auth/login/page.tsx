'use client';

import type { Metadata } from 'next';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@unity/shared';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/components/ui/toast-context';
import { FormField } from '@/components/forms/FormField';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuthStore();
  const { toast } = useToast();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { login: '', password: '' },
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      const json = await res.json();

      if (!res.ok) {
        toast(json.error?.message ?? 'Неверный email или пароль', 'error');
        return;
      }

      const user = json.data.user;
      setUser(user);

      const from = searchParams.get('from');
      const activeRole = user.activeRole ?? user.roles?.[0];
      const defaultRedirect = activeRole === 'employer'
        ? '/employer/dashboard'
        : activeRole === 'admin'
        ? '/admin/dashboard'
        : '/worker/dashboard';

      router.push(from ?? defaultRedirect);
    } catch {
      toast('Ошибка подключения к серверу', 'error');
    }
  };

  return (
    <div className="rounded-modal border border-gray-200 bg-white p-8 shadow-card">
      <h1 className="text-center text-2xl font-bold text-gray-900">Вход в аккаунт</h1>
      <p className="mt-2 text-center text-sm text-gray-500">
        Нет аккаунта?{' '}
        <Link href="/auth/register" className="font-medium text-primary-600 hover:text-primary-700">
          Зарегистрируйтесь
        </Link>
      </p>

      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-4">
        <FormField
          label="Email или телефон"
          type="text"
          placeholder="your@email.com"
          error={form.formState.errors.login?.message}
          {...form.register('login')}
        />
        <FormField
          label="Пароль"
          type="password"
          placeholder="Введите пароль"
          error={form.formState.errors.password?.message}
          {...form.register('password')}
        />

        <div className="flex items-center justify-end">
          <Link href="/auth/forgot-password" className="text-sm font-medium text-primary-600 hover:text-primary-700">
            Забыли пароль?
          </Link>
        </div>

        <button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="w-full rounded-input bg-primary-500 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {form.formState.isSubmitting ? 'Входим...' : 'Войти'}
        </button>
      </form>
    </div>
  );
}
