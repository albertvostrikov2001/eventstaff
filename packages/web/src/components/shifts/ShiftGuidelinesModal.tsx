'use client';

import { useEffect } from 'react';
import { ShieldCheck, X, CheckCircle2 } from 'lucide-react';

type Variant = 'worker' | 'employer';

interface Props {
  variant: Variant;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
  /** Override the confirm button label. */
  confirmLabel?: string;
}

const CONTENT: Record<
  Variant,
  { heading: string; lead: string; sub: string; listTitle: string; items: string[]; outro: string }
> = {
  worker: {
    heading: 'Памятка исполнителю',
    lead: 'Профессионализм начинается с ответственности.',
    sub: 'Каждый подтверждённый выход — это доверие работодателя к вам и вашей репутации.',
    listTitle: 'Мы ценим исполнителей, которые:',
    items: [
      'соблюдают договорённости;',
      'приходят вовремя и готовы к работе;',
      'поддерживают высокий уровень сервиса;',
      'заранее предупреждают об изменениях;',
      'уважительно относятся к команде и гостям.',
    ],
    outro:
      'Надёжность и дисциплина формируют вашу профессиональную репутацию и открывают доступ к лучшим предложениям и постоянному сотрудничеству.',
  },
  employer: {
    heading: 'Памятка работодателю',
    lead: 'Сильная команда строится на уважении и прозрачных условиях.',
    sub: 'Исполнители представляют ваш сервис и напрямую влияют на впечатление гостей.',
    listTitle: 'Мы рекомендуем работодателям:',
    items: [
      'публиковать точную и актуальную информацию о сменах;',
      'обеспечивать прозрачные условия сотрудничества;',
      'уважительно взаимодействовать с персоналом;',
      'соблюдать договорённости и сроки оплаты;',
      'создавать профессиональную рабочую атмосферу.',
    ],
    outro:
      'Компании, которые ценят людей, всегда получают более мотивированных и сильных сотрудников.',
  },
};

/**
 * Pre-acceptance guidelines memo shown before a worker accepts a shift or an
 * employer assigns one. Informational — the user confirms to proceed.
 */
export function ShiftGuidelinesModal({ variant, onConfirm, onClose, loading = false, confirmLabel }: Props) {
  const c = CONTENT[variant];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, loading]);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !loading && onClose()} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={c.heading}
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[18px] border border-white/[0.1] bg-[#101f18] text-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
              <ShieldCheck className="h-5 w-5 text-emerald-300" />
            </div>
            <h3 className="text-lg font-semibold">{c.heading}</h3>
          </div>
          <button
            type="button"
            onClick={() => !loading && onClose()}
            aria-label="Закрыть"
            className="shrink-0 rounded-full p-1.5 text-white/40 transition hover:bg-white/[0.08] hover:text-white/80"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5">
          <p className="text-[15px] font-semibold text-white">{c.lead}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-white/65">{c.sub}</p>

          <p className="mt-5 text-sm font-medium text-white/85">{c.listTitle}</p>
          <ul className="mt-3 space-y-2.5">
            {c.items.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-white/70">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300/80" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <p className="mt-5 rounded-[12px] border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3 text-sm leading-relaxed text-emerald-100/80">
            {c.outro}
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-white/[0.08] px-6 py-4">
          <button
            type="button"
            onClick={() => !loading && onClose()}
            disabled={loading}
            className="flex-1 rounded-[10px] border border-white/15 py-2.5 text-sm font-medium text-white/60 transition hover:border-white/30 hover:text-white/80 disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-[10px] bg-emerald-500 py-2.5 text-sm font-semibold text-[#08120e] transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {loading ? 'Подождите…' : confirmLabel ?? 'Понятно, принимаю'}
          </button>
        </div>
      </div>
    </div>
  );
}
