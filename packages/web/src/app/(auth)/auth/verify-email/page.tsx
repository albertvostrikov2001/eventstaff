'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { getPublicApiBase } from '@/lib/api/publicApiBase';
import type { RoleKey } from '@unity/shared';

type Status = 'verifying' | 'success' | 'error' | 'notoken';

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuthStore();

  const token = searchParams.get('token') ?? '';
  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'notoken');
  const [errorMsg, setErrorMsg] = useState('');
  const ranRef = useRef(false);

  useEffect(() => {
    if (!token || ranRef.current) return;
    ranRef.current = true; // защита от двойного вызова в StrictMode

    const API = getPublicApiBase();
    if (!API) return;

    void (async () => {
      try {
        const res = await fetch(`${API}/auth/verify-email-link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
          credentials: 'include',
        });
        const json = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
          data?: { user: { id: string; email?: string | null; phone?: string | null; roles?: string[]; activeRole?: string } };
        };

        if (!res.ok || !json.data?.user) {
          setErrorMsg(json.error?.message ?? 'Ссылка недействительна или устарела.');
          setStatus('error');
          return;
        }

        const user = json.data.user;
        setUser({
          id: user.id,
          email: user.email ?? null,
          phone: user.phone ?? null,
          roles: (user.roles ?? []) as RoleKey[],
          activeRole: (user.activeRole ?? user.roles?.[0] ?? 'worker') as RoleKey,
        });
        setStatus('success');
        const role = user.activeRole ?? user.roles?.[0];
        setTimeout(() => {
          router.push(role === 'employer' ? '/employer/dashboard' : '/worker/dashboard');
        }, 1500);
      } catch {
        setErrorMsg('Не удалось связаться с сервером. Попробуйте ещё раз.');
        setStatus('error');
      }
    })();
  }, [token, router, setUser]);

  return (
    <div className="rounded-modal border border-gray-200 bg-white p-8 shadow-card">
      <div className="flex flex-col items-center gap-3 text-center">
        {status === 'verifying' && (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100">
              <Loader2 className="h-7 w-7 animate-spin text-primary-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Подтверждаем почту…</h1>
            <p className="text-sm text-gray-500">Секунду, проверяем ссылку.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Почта подтверждена!</h1>
            <p className="text-sm text-gray-500">Перенаправляем вас в личный кабинет…</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-7 w-7 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Не получилось подтвердить</h1>
            <p className="text-sm text-gray-500">{errorMsg}</p>
            <a
              href="/auth/login"
              className="mt-2 rounded-input bg-primary-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-600"
            >
              Войти
            </a>
            <p className="mt-1 text-xs text-gray-400">
              Войдите в аккаунт — мы пришлём новую ссылку для подтверждения почты из настроек.
            </p>
          </>
        )}

        {status === 'notoken' && (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100">
              <Mail className="h-7 w-7 text-primary-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Подтверждение почты</h1>
            <p className="text-sm text-gray-500">
              Откройте ссылку из письма, которое мы отправили на вашу почту. Если письма нет — проверьте папку «Спам».
            </p>
            <a
              href="/auth/login"
              className="mt-2 rounded-input bg-primary-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-600"
            >
              Войти
            </a>
          </>
        )}
      </div>
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
