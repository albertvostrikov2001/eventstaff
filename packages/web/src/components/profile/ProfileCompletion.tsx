'use client';

export interface ProfileCompletionItem {
  label: string;
  done: boolean;
}

interface Props {
  items: ProfileCompletionItem[];
}

/**
 * Индикатор заполненности профиля.
 * Показывает прогресс и список незаполненных пунктов.
 * Полностью исчезает при 100% заполнения.
 */
export function ProfileCompletion({ items }: Props) {
  const total = items.length;
  const done = items.filter((i) => i.done).length;
  if (total === 0) return null;
  const pct = Math.round((done / total) * 100);
  if (pct === 100) return null;

  const remaining = items.filter((i) => !i.done);

  return (
    <div className="rounded-[14px] border border-amber-400/20 bg-amber-400/[0.05] p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-white/90">
          Профиль заполнен на {pct}%
        </span>
        <span className="text-xs text-white/45">
          {done} из {total}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className="h-full rounded-full bg-amber-400/70 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {remaining.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-xs text-white/55">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/50" />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
