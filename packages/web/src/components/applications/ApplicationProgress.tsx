'use client';

import { Check } from 'lucide-react';

/**
 * Визуальный степпер пути найма для одного отклика.
 * Показывает, на каком этапе находится отклик: Откликнулся → Просмотрен → На связи → Принят → Смена.
 * Для отклонённых/отменённых откликов не показывается.
 */
const STAGES = [
  { key: 'pending', label: 'Отклик' },
  { key: 'viewed', label: 'Просмотрен' },
  { key: 'interview', label: 'На связи' },
  { key: 'confirmed', label: 'Принят' },
  { key: 'completed', label: 'Смена' },
] as const;

// Порядковый индекс этапа для каждого статуса отклика.
const STATUS_INDEX: Record<string, number> = {
  pending: 0,
  viewed: 1,
  interview: 2,
  invited: 2,
  confirmed: 3,
  shift_started: 3,
  completed: 4,
};

export function ApplicationProgress({ status }: { status: string }) {
  // Terminal negative states — no progress bar.
  if (status === 'rejected' || status === 'cancelled') return null;
  const current = STATUS_INDEX[status];
  if (current == null) return null;

  return (
    <div className="flex items-center gap-1">
      {STAGES.map((stage, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={stage.key} className="flex items-center gap-1">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  done
                    ? 'bg-emerald-500/30 text-emerald-200'
                    : active
                      ? 'bg-primary-500/40 text-white ring-2 ring-primary-400/40'
                      : 'bg-white/[0.06] text-white/30'
                }`}
              >
                {done ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <span
                className={`text-[9px] leading-none ${
                  active ? 'text-white/80' : done ? 'text-white/50' : 'text-white/25'
                }`}
              >
                {stage.label}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div className={`mb-3 h-px w-4 ${i < current ? 'bg-emerald-500/40' : 'bg-white/[0.08]'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
