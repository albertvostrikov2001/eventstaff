'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { CalendarCheck, ArrowRight, X } from 'lucide-react';

type Variant = 'worker' | 'employer';

const CONTENT: Record<Variant, { title: string; desc: string; href: string; cta: string }> = {
  worker: {
    title: 'Приглашение принято!',
    desc: 'Смена создана. Перейдите в раздел «Мои смены», чтобы подтвердить выход — без подтверждения смена не станет активной.',
    href: '/worker/shifts',
    cta: 'Перейти в «Мои смены»',
  },
  employer: {
    title: 'Отклик принят — смена назначена',
    desc: 'Смена ждёт подтверждения работника. Отслеживайте её статус и завершайте в разделе «Смены».',
    href: '/employer/shifts',
    cta: 'Перейти в «Смены»',
  },
};

/**
 * Lightweight next-step reminder shown right after a worker accepts an
 * invitation or an employer accepts an application — points to the Shifts section.
 */
export function NextStepReminderModal({
  variant,
  onClose,
}: {
  variant: Variant;
  onClose: () => void;
}) {
  const c = CONTENT[variant];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={c.title}
        className="relative z-10 w-full max-w-sm overflow-hidden rounded-[18px] border border-emerald-500/25 bg-[#101f18] p-6 text-center text-white shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition hover:bg-white/[0.08] hover:text-white/80"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15">
          <CalendarCheck className="h-6 w-6 text-emerald-300" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">{c.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-white/65">{c.desc}</p>

        <div className="mt-6 flex flex-col gap-2">
          <Link
            href={c.href}
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-emerald-500 py-2.5 text-sm font-semibold text-[#08120e] transition hover:bg-emerald-400"
          >
            {c.cta}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] py-2 text-sm font-medium text-white/50 transition hover:text-white/80"
          >
            Позже
          </button>
        </div>
      </div>
    </div>
  );
}
