'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function EmployerErrorPage({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <p className="font-display text-7xl font-bold text-primary-400">500</p>
      <h1 className="text-2xl font-bold text-white">Что-то пошло не так</h1>
      <p className="max-w-sm text-sm text-white/60">
        Мы уже знаем о проблеме и работаем над её устранением
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="button" variant="primary" onClick={reset} className="rounded-input">
          Попробовать снова
        </Button>
        <Link
          href="/employer/dashboard"
          className="rounded-input border border-white/20 px-6 py-2.5 text-sm font-medium text-white/70 hover:border-white/40 hover:text-white"
        >
          На дашборд
        </Link>
      </div>
    </div>
  );
}
