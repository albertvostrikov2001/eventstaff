'use client';

import Link from 'next/link';
import { AlertCircle, ChevronRight } from 'lucide-react';

export interface ActionItem {
  label: string;
  href: string;
  count?: number;
}

interface Props {
  items: ActionItem[];
}

/**
 * Приоритетный блок "Требует действия сейчас" на дашборде.
 * Показывает только то, что реально требует реакции пользователя.
 * Скрывается, если действий нет.
 */
export function ActionRequired({ items }: Props) {
  const visible = items.filter((i) => (i.count ?? 1) > 0);
  if (visible.length === 0) return null;

  return (
    <div className="mt-6 rounded-[14px] border border-amber-400/25 bg-amber-400/[0.06] p-4">
      <div className="mb-3 flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-amber-300" />
        <h3 className="text-sm font-semibold text-white/90">Требует действия</h3>
      </div>
      <div className="space-y-1.5">
        {visible.map((item) => (
          <Link
            key={item.href + item.label}
            href={item.href}
            className="flex items-center gap-3 rounded-[10px] px-2 py-2 transition hover:bg-white/[0.05]"
          >
            {item.count != null && (
              <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-amber-400/20 px-1.5 text-xs font-bold text-amber-200">
                {item.count > 99 ? '99+' : item.count}
              </span>
            )}
            <span className="flex-1 text-sm text-white/85">{item.label}</span>
            <ChevronRight className="h-4 w-4 text-white/30" />
          </Link>
        ))}
      </div>
    </div>
  );
}
