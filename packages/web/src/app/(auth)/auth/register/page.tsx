'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/components/ui/toast-context';
import { FormField } from '@/components/forms/FormField';
import { FormCheckbox } from '@/components/forms/FormField';
import { Users, Briefcase } from 'lucide-react';
import { API_UNREACHABLE_HINT, getPublicApiBase } from '@/lib/api/publicApiBase';

const registerFormSchema = z
  .object({
    role: z.enum(['worker', 'employer']),
    email: z.string().email('Некорректный email'),
    password: z.string().min(8, 'Минимум 8 символов'),
    confirmPassword: z.string(),
    consentGiven: z.literal(true, {
      errorMap: () => ({ message: 'Необходимо согласие на обработку данных' }),
    }),
    isAdult: z.literal(true, {
      errorMap: () => ({ message: 'Необходимо подтвердить возраст 18+' }),
    }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerFormSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      role: 'worker',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const selectedRole = form.watch('role');

  const onRoleSelect = (role: 'worker' | 'employer') => {
    form.setValue('role', role);
    setStep(2);
  };

  const onSubmit = async (data: RegisterForm) => {
    const API = getPublicApiBase();
    if (!API) {
      toast(
        'С GitHub Pages нужен публичный API. Задайте переменную NEXT_PUBLIC_API_URL в настройках Actions и пересоберите сайт.',
        'error',
      );
      return;
    }
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          role: data.role,
          consentGiven: true,
          isAdult: true,
        }),
        credentials: 'include',
      });

      const text = await res.text();
      let json: { error?: { message?: string }; data?: { user: Parameters<typeof setUser>[0] } };
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        toast('Сервер вернул неверный ответ. Проверьте, что API запущен.', 'error');
        return;
      }

      if (!res.ok) {
        toast(json.error?.message ?? 'Ошибка регистрации', 'error');
        return;
      }

      const user = json.data?.user;
      if (!user) {
        toast('Некорректный ответ сервера', 'error');
        return;
      }
      setUser(user);

      toast('Профиль создан! Заполните информацию о себе.', 'success');

      const redirect = data.role === 'employer' ? '/employer/profile' : '/worker/profile';
      router.push(redirect);
    } catch (e) {
      const net =
        e instanceof TypeError ? API_UNREACHABLE_HINT : 'Ошибка подключения к серверу';
      toast(net, 'error');
    }
  };

  return (
    <div className="rounded-modal border border-gray-200 bg-white p-8 shadow-card">
      <h1 className="text-center text-2xl font-bold text-gray-900">Создать аккаунт</h1>
      <p className="mt-2 text-center text-sm text-gray-500">
        Уже есть аккаунт?{' '}
        <Link href="/auth/login" className="font-medium text-primary-600 hover:text-primary-700">
          Войдите
        </Link>
      </p>

      {step === 1 ? (
        <div className="mt-8">
          <p className="mb-4 text-center text-sm font-medium text-gray-700">
            Я регистрируюсь как...
          </p>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => onRoleSelect('employer')}
              className="flex flex-col items-center gap-3 rounded-card border-2 border-gray-200 p-6 text-center transition hover:border-primary-400 hover:bg-primary-50"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100">
                <Briefcase className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Работодатель</div>
                <div className="mt-1 text-xs text-gray-500">Ищу персонал для мероприятий</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => onRoleSelect('worker')}
              className="flex flex-col items-center gap-3 rounded-card border-2 border-gray-200 p-6 text-center transition hover:border-primary-400 hover:bg-primary-50"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100">
                <Users className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Специалист</div>
                <div className="mt-1 text-xs text-gray-500">Ищу работу на мероприятиях</div>
              </div>
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
              {selectedRole === 'employer' ? 'Работодатель' : 'Специалист'}
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Изменить
            </button>
          </div>

          <FormField
            label="Email"
            type="email"
            placeholder="your@email.com"
            required
            error={form.formState.errors.email?.message}
            {...form.register('email')}
          />
          <FormField
            label="Пароль"
            type="password"
            placeholder="Минимум 8 символов"
            required
            error={form.formState.errors.password?.message}
            {...form.register('password')}
          />
          <FormField
            label="Подтвердите пароль"
            type="password"
            placeholder="Повторите пароль"
            required
            error={form.formState.errors.confirmPassword?.message}
            {...form.register('confirmPassword')}
          />

          <div className="space-y-3 pt-1">
            <FormCheckbox
              label={
                <span>
                  Я соглашаюсь с{' '}
                  <Link href="/legal/terms" className="font-medium text-primary-600 hover:underline">
                    условиями использования
                  </Link>{' '}
                  и{' '}
                  <Link href="/legal/privacy" className="font-medium text-primary-600 hover:underline">
                    политикой конфиденциальности
                  </Link>
                </span>
              }
              error={form.formState.errors.consentGiven?.message}
              {...form.register('consentGiven')}
            />
            <FormCheckbox
              label="Подтверждаю, что мне исполнилось 18 лет"
              error={form.formState.errors.isAdult?.message}
              {...form.register('isAdult')}
            />
          </div>

          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="w-full rounded-input bg-primary-500 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {form.formState.isSubmitting ? 'Создаём аккаунт...' : 'Зарегистрироваться'}
          </button>
        </form>
      )}
    </div>
  );
}
