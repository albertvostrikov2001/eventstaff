'use client';

import { AlertTriangle, X } from 'lucide-react';
import type { ScheduleConflictDetail } from '@/hooks/useApplyToVacancy';

type Props = {
  open: boolean;
  message: string;
  conflicts: ScheduleConflictDetail[];
  confirming?: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
  confirmLabel?: string;
};

export function ScheduleConflictDialog({
  open,
  message,
  conflicts,
  confirming = false,
  onConfirm,
  onDismiss,
  confirmLabel = 'Всё равно продолжить',
}: Props) {
  if (!open) return null;

  const dateLabel = conflicts[0]?.date
    ? new Date(`${conflicts[0].date}T12:00:00`).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-conflict-title"
    >
      <div className="w-full max-w-md rounded-card border border-amber-500/30 bg-[#1a1f1c] p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15">
              <AlertTriangle className="h-5 w-5 text-amber-400" aria-hidden />
            </div>
            <div>
              <h2 id="schedule-conflict-title" className="font-semibold text-white/90">
                Пересечение по расписанию
              </h2>
              <p className="mt-1 text-sm text-white/65">{message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-white/80"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {dateLabel && (
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-white/50">
            Дата: {dateLabel}
          </p>
        )}

        <ul className="mt-3 space-y-2">
          {conflicts.map((c) => (
            <li
              key={c.shiftId}
              className="rounded-input border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/75"
            >
              {c.vacancyTitle ? (
                <>Смена: «{c.vacancyTitle}»</>
              ) : (
                <>Запланированная смена</>
              )}
              <span className="ml-2 text-xs text-white/50">({c.status})</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onDismiss}
            disabled={confirming}
            className="rounded-input border border-white/15 px-4 py-2.5 text-sm font-medium text-white/75 transition hover:bg-white/[0.06] disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming}
            className="rounded-input bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:opacity-50"
          >
            {confirming ? 'Отправка…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
