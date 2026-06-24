'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Suspense } from 'react';

function PaymentReturnContent() {
  const sp = useSearchParams();
  const ok = sp.get('status') !== 'failed' && sp.get('error') == null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--u-bg-dark)' }}>
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      {ok ? (
        <>
          <CheckCircle2 className="h-16 w-16 text-emerald-400" />
          <h1 className="mt-4 text-2xl font-semibold text-white">Оплата прошла успешно</h1>
          <p className="mt-2 max-w-md text-sm text-white/50">
            Платёж зарегистрирован. Статус обновится в кабинете в течение минуты.
          </p>
        </>
      ) : (
        <>
          <XCircle className="h-16 w-16 text-red-400" />
          <h1 className="mt-4 text-2xl font-semibold text-white">Что-то пошло не так</h1>
          <p className="mt-2 max-w-md text-sm text-white/50">
            Попробуйте снова или обратитесь в поддержку. Смена останется доступна для оплаты.
          </p>
        </>
      )}
      <Link
        href="/employer/dashboard"
        className="mt-8 inline-flex rounded-input bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-600"
      >
        Вернуться в кабинет
      </Link>
    </div>
    </div>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen container-page py-20 text-center text-white/50" style={{ background: 'var(--u-bg-dark)' }}>Загрузка…</div>
      }
    >
      <PaymentReturnContent />
    </Suspense>
  );
}
