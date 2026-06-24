'use client';

import Link from 'next/link';
import { CheckCircle, Circle } from 'lucide-react';

export interface ChecklistItem {
  label: string;
  done: boolean;
  href: string;
  cta: string;
}

interface Props {
  title: string;
  items: ChecklistItem[];
}

/**
 * Onboarding-чеклист для новых пользователей.
 * Показывает пошаговые действия для старта работы на платформе.
 * Полностью исчезает, когда все шаги выполнены.
 */
export function OnboardingChecklist({ title, items }: Props) {
  if (items.length === 0 || items.every((i) => i.done)) return null;
  const doneCount = items.filter((i) => i.done).length;

  return (
    <div className="mt-6 rounded-[14px] border border-[var(--accent)]/25 bg-[var(--accent)]/[0.05] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <span className="text-xs text-white/45">
          {doneCount} / {items.length}
        </span>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            {item.done ? (
              <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
            ) : (
              <Circle className="h-5 w-5 shrink-0 text-white/25" />
            )}
            <span
              className={`flex-1 text-sm ${
                item.done ? 'text-white/40 line-through' : 'text-white/80'
              }`}
            >
              {item.label}
            </span>
            {!item.done && (
              <Link
                href={item.href}
                className="shrink-0 rounded-full bg-[var(--accent)]/20 px-3 py-1 text-xs font-semibold text-[var(--accent)] transition hover:bg-[var(--accent)]/30"
              >
                {item.cta}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
