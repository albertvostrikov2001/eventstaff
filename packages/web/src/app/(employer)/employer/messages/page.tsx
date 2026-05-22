'use client';

import Link from 'next/link';

export default function EmployerMessagesIndexPage() {
  return (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-[14px] border border-white/[0.08] bg-white/[0.03] px-6 py-16 text-center">
      <p className="text-base font-medium text-white/65">Выберите диалог</p>
      <p className="mt-1 max-w-sm text-sm text-white/50">
        Чат открывается после отклика, приглашения или смены с исполнителем
      </p>
      <Link href="/employer/search" className="mt-4 text-sm text-emerald-400 hover:underline">
        Найти персонал
      </Link>
    </div>
  );
}
