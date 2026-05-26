'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/components/ui/toast-context';
import { FormField } from '@/components/forms/FormField';
import { FormCheckbox } from '@/components/forms/FormField';
import { Users, Briefcase, Mail, RefreshCw } from 'lucide-react';
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
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Pending verification state
  const [pendingUserId, setPendingUserId] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [codeDigits, setCodeDigits] = useState(['', '', '', '', '', '']);
  const [verifying, setVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { role: 'worker', email: '', password: '', confirmPassword: '' },
  });

  const selectedRole = form.watch('role');

  const onRoleSelect = (role: 'worker' | 'employer') => {
    form.setValue('role', role);
    setStep(2);
  };

  // Start countdown after resend
  function startCooldown(seconds = 60) {
    setResendCooldown(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  const onSubmit = async (data: RegisterForm) => {
    const API = getPublicApiBase();
    if (!API) {
      toast('С GitHub Pages нужен публичный API. Задайте переменную NEXT_PUBLIC_API_URL в настройках Actions и пересоберите сайт.', 'error');
      return;
    }
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, password: data.password, role: data.role, consentGiven: true, isAdult: true }),
        credentials: 'include',
      });

      const text = await res.text();
      let json: { error?: { message?: string }; data?: { pendingUserId?: string; email?: string; user?: Parameters<typeof setUser>[0] } };
      try { json = text ? JSON.parse(text) : {}; } catch {
        toast('Сервер вернул неверный ответ.', 'error');
        return;
      }

      if (!res.ok) {
        toast(json.error?.message ?? 'Ошибка регистрации', 'error');
        return;
      }

      // If server returns pendingUserId — need email verification
      if (json.data?.pendingUserId) {
        setPendingUserId(json.data.pendingUserId);
        setPendingEmail(json.data.email ?? data.email);
        setCodeDigits(['', '', '', '', '', '']);
        setStep(3);
        startCooldown(60);
        return;
      }

      // Phone-only path (immediate login)
      const user = json.data?.user;
      if (user) {
        setUser(user);
        toast('Профиль создан!', 'success');
        router.push(data.role === 'employer' ? '/employer/profile' : '/worker/profile');
      }
    } catch (e) {
      toast(e instanceof TypeError ? API_UNREACHABLE_HINT : 'Ошибка подключения к серверу', 'error');
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...codeDigits];
    next[index] = digit;
    setCodeDigits(next);
    if (digit && index < 5) {
      digitRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !codeDigits[index] && index > 0) {
      digitRefs.current[index - 1]?.focus();
    }
  };

  const handleDigitPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCodeDigits(pasted.split(''));
      digitRefs.current[5]?.focus();
    }
  };

  const submitCode = async () => {
    const code = codeDigits.join('');
    if (code.length < 6) { toast('Введите все 6 цифр', 'error'); return; }
    const API = getPublicApiBase();
    if (!API) return;
    setVerifying(true);
    try {
      const res = await fetch(`${API}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: pendingUserId, code }),
        credentials: 'include',
      });
      const json = await res.json().catch(() => ({})) as { error?: { message?: string }; data?: { user: Parameters<typeof setUser>[0] } };

      if (!res.ok) {
        toast(json.error?.message ?? 'Неверный код', 'error');
        setCodeDigits(['', '', '', '', '', '']);
        digitRefs.current[0]?.focus();
        return;
      }

      const user = json.data?.user;
      if (!user) { toast('Ошибка сервера', 'error'); return; }
      setUser(user);
      toast('Email подтверждён! Добро пожаловать.', 'success');
      const role = user.activeRole as string;
      router.push(role === 'employer' ? '/employer/profile' : '/worker/profile');
    } catch {
      toast('Ошибка подключения', 'error');
    } finally {
      setVerifying(false);
    }
  };

  const resendCode = async () => {
    if (resendCooldown > 0) return;
    const API = getPublicApiBase();
    if (!API) return;
    try {
      const res = await fetch(`${API}/auth/resend-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: pendingUserId }),
        credentials: 'include',
      });
      if (res.ok) {
        toast('Новый код отправлен на почту', 'success');
        startCooldown(60);
      } else {
        const json = await res.json().catch(() => ({})) as { error?: { message?: string } };
        toast(json.error?.message ?? 'Ошибка повторной отправки', 'error');
      }
    } catch {
      toast('Ошибка подключения', 'error');
    }
  };

  return (
    <div className="auth-form-card rounded-modal border border-gray-200 p-8 shadow-card" style={{ background: '#ffffff' }}>
      <h1 className="text-center text-2xl font-bold text-gray-900">Создать аккаунт</h1>
      <p className="mt-2 text-center text-sm text-gray-500">
        Уже есть аккаунт?{' '}
        <Link href="/auth/login" className="font-medium text-primary-600 hover:text-primary-700">
          Войдите
        </Link>
      </p>

      {/* Step 1 — role selection */}
      {step === 1 && (
        <div className="mt-8">
          <p className="mb-4 text-center text-sm font-medium text-gray-700">Я регистрируюсь как...</p>
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
      )}

      {/* Step 2 — registration form */}
      {step === 2 && (
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
              {selectedRole === 'employer' ? 'Работодатель' : 'Специалист'}
            </div>
            <button type="button" onClick={() => setStep(1)} className="text-xs text-gray-500 hover:text-gray-700">
              Изменить
            </button>
          </div>

          <FormField variant="default" label="Email" type="email" placeholder="your@email.com" required error={form.formState.errors.email?.message} {...form.register('email')} />
          <FormField variant="default" label="Пароль" type="password" placeholder="Минимум 8 символов" required error={form.formState.errors.password?.message} {...form.register('password')} />
          <FormField variant="default" label="Подтвердите пароль" type="password" placeholder="Повторите пароль" required error={form.formState.errors.confirmPassword?.message} {...form.register('confirmPassword')} />

          <div className="space-y-3 pt-1">
            <FormCheckbox
              label={
                <span>
                  Я соглашаюсь с{' '}
                  <Link href="/legal/terms" className="font-medium text-primary-600 hover:underline">условиями использования</Link>{' '}
                  и{' '}
                  <Link href="/legal/privacy" className="font-medium text-primary-600 hover:underline">политикой конфиденциальности</Link>
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

      {/* Step 3 — email verification code */}
      {step === 3 && (
        <div className="mt-8">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100">
              <Mail className="h-7 w-7 text-primary-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Подтвердите email</h2>
            <p className="text-center text-sm text-gray-500">
              Мы отправили 6-значный код на{' '}
              <span className="font-medium text-gray-700">{pendingEmail}</span>.<br />
              Введите его ниже для завершения регистрации.
            </p>
          </div>

          {/* OTP input */}
          <div className="mt-6 flex justify-center gap-2" onPaste={handleDigitPaste}>
            {codeDigits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { digitRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleDigitKeyDown(i, e)}
                className="h-12 w-11 rounded-lg border-2 border-gray-300 text-center text-xl font-bold text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => void submitCode()}
            disabled={verifying || codeDigits.join('').length < 6}
            className="mt-6 w-full rounded-input bg-primary-500 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {verifying ? 'Проверяем...' : 'Подтвердить'}
          </button>

          <div className="mt-4 text-center">
            {resendCooldown > 0 ? (
              <p className="text-sm text-gray-400">
                Отправить повторно через <span className="font-medium text-gray-600">{resendCooldown}с</span>
              </p>
            ) : (
              <button
                type="button"
                onClick={() => void resendCode()}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Отправить код повторно
              </button>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-gray-400">
            Код действителен 10 минут. Проверьте папку «Спам», если письмо не пришло.
          </p>
        </div>
      )}
    </div>
  );
}
