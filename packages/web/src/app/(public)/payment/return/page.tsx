'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Suspense } from 'react';

function PaymentReturnContent() {
  const sp = useSearchParams();
  const ok = sp.get('status') !== 'failed' && sp.get('error') == null;

  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      {ok ? (
        <>
          <CheckCircle2 className="h-16 w-16 text-emerald-500" />
          <h1 className="mt-4 text-2xl font-semibold text-gray-900">Оплата прошла успешно</h1>
          <p className="mt-2 max-w-md text-sm text-gray-500">
            Платёж зарегистрирован. Статус обновится в кабинете в течение минуты.
          </p>
        </>
      ) : (
        <>
          <XCircle className="h-16 w-16 text-red-400" />
          <h1 className="mt-4 text-2xl font-semibold text-gray-900">Что-то пошло не так</h1>
          <p className="mt-2 max-w-md text-sm text-gray-500">
            Попробуйте снова или обратитесь в поддержку. Смена останется доступна для оплаты.
          </p>
        </>
      )}
      <Link
        href="/employer/payments"
        className="mt-8 inline-flex rounded-input bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-600"
      >
        Вернуться к оплатам
      </Link>
    </div>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="container-page py-20 text-center text-gray-500">Загрузка…</div>
      }
    >
      <PaymentReturnContent />
    </Suspense>
  );
}
