'use client';

import { Suspense, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/components/ui/toast-context';
import { getPublicApiBase } from '@/lib/api/publicApiBase';
import type { RoleKey } from '@unity/shared';

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuthStore();
  const { toast } = useToast();

  const userId = searchParams.get('userId') ?? '';
  const email = searchParams.get('email') ?? '';

  const [codeDigits, setCodeDigits] = useState(['', '', '', '', '', '']);
  const [verifying, setVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);

  function startCooldown(seconds = 60) {
    setResendCooldown(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return s - 1;
      });
    }, 1000);
  }

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...codeDigits];
    next[index] = digit;
    setCodeDigits(next);
    if (digit && index < 5) digitRefs.current[index + 1]?.focus();
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !codeDigits[index] && index > 0) digitRefs.current[index - 1]?.focus();
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
        body: JSON.stringify({ userId, code }),
        credentials: 'include',
      });
      const json = await res.json().catch(() => ({})) as {
        error?: { message?: string };
        data?: { user: { id: string; email?: string | null; phone?: string | null; roles?: string[]; activeRole?: string } };
      };

      if (!res.ok) {
        toast(json.error?.message ?? 'Неверный код', 'error');
        setCodeDigits(['', '', '', '', '', '']);
        digitRefs.current[0]?.focus();
        return;
      }

      const user = json.data?.user;
      if (!user) { toast('Ошибка сервера', 'error'); return; }

      setUser({
        id: user.id,
        email: user.email ?? null,
        phone: user.phone ?? null,
        roles: (user.roles ?? []) as RoleKey[],
        activeRole: (user.activeRole ?? user.roles?.[0] ?? 'worker') as RoleKey,
      });

      toast('Email подтверждён! Добро пожаловать.', 'success');
      const role = user.activeRole ?? user.roles?.[0];
      router.push(role === 'employer' ? '/employer/dashboard' : '/worker/dashboard');
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
        body: JSON.stringify({ userId }),
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

  if (!userId) {
    return (
      <div className="rounded-modal border border-gray-200 bg-white p-8 shadow-card text-center">
        <p className="text-gray-500 text-sm">Недействительная ссылка. <a href="/auth/register" className="text-primary-600 font-medium hover:underline">Зарегистрируйтесь</a> заново.</p>
      </div>
    );
  }

  return (
    <div className="rounded-modal border border-gray-200 bg-white p-8 shadow-card">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100">
          <Mail className="h-7 w-7 text-primary-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Подтвердите email</h1>
        <p className="text-center text-sm text-gray-500">
          Мы отправили 6-значный код на{' '}
          <span className="font-medium text-gray-700">{email || 'вашу почту'}</span>.
        </p>
      </div>

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
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="rounded-modal border border-gray-200 bg-white p-8 shadow-card"><div className="h-8 animate-pulse rounded bg-gray-100" /></div>}>
      <VerifyEmailForm />
    </Suspense>
  );
}
