'use client';

import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Column<T> = {
  key: string;
  header: string;
  render: (item: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
  /** Скрыть колонку на узких экранах в таблице (остаётся только в mobileCard) */
  hideOnMobile?: boolean;
};

export type MobileCardConfig<T> = {
  title: (item: T) => ReactNode;
  subtitle?: (item: T) => ReactNode;
  badge?: (item: T) => ReactNode;
  meta?: (item: T) => ReactNode;
  actions?: (item: T) => ReactNode;
};

export type ResponsiveTableProps<T> = {
  data: T[];
  columns: Column<T>[];
  mobileCard: MobileCardConfig<T>;
  keyExtractor: (item: T) => string;
  emptyState?: ReactNode;
  isLoading?: boolean;
  skeletonRows?: number;
  onRowClick?: (item: T) => void;
  /** @deprecated используйте skeletonRows */
  skeletonCount?: number;
  /** dark — кабинет работодателя; light — светлые страницы */
  variant?: 'dark' | 'light';
};

/** @deprecated используйте Column */
export type ResponsiveTableColumn<T> = Column<T>;

function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-white/[0.06]', className)} />;
}

export function ResponsiveTable<T>({
  data,
  columns,
  mobileCard,
  keyExtractor,
  emptyState,
  isLoading,
  skeletonRows = 5,
  skeletonCount,
  onRowClick,
  variant = 'dark',
}: ResponsiveTableProps<T>) {
  const rows = skeletonCount ?? skeletonRows;
  const isLight = variant === 'light';

  const tableWrap = cn(
    'hidden w-full overflow-x-auto rounded-xl border sm:block',
    isLight ? 'border-gray-200 bg-white' : 'border-white/[0.08]',
  );

  const theadBg = isLight ? 'bg-gray-100' : 'bg-white/[0.04]';
  const thText = isLight ? 'text-gray-500' : 'text-white/45';
  const thBorder = isLight ? 'border-b border-gray-200' : 'border-b border-white/[0.08]';
  const trBorder = isLight ? 'border-b border-gray-100' : 'border-b border-white/[0.06]';
  const trHover = isLight ? 'hover:bg-gray-50/90' : 'hover:bg-white/[0.03]';
  const tdText = isLight ? 'text-gray-900' : 'text-[rgba(255,255,255,0.85)]';
  const cardBorder = isLight ? 'border-gray-200 bg-gray-50/80' : 'border-white/[0.08] bg-white/[0.04]';

  if (isLoading) {
    return (
      <>
        <div className={tableWrap}>
          <table className="w-full border-separate border-spacing-0 text-[0.9375rem]">
            <thead className={theadBg}>
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={cn(
                      'px-4 py-2.5 text-left align-middle text-[0.75rem] font-medium uppercase tracking-[0.05em]',
                      thText,
                      thBorder,
                      c.headerClassName,
                      c.hideOnMobile && 'hidden md:table-cell',
                    )}
                  >
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(rows)].map((_, i) => (
                <tr key={i} className={cn(trBorder, 'transition-colors last:border-b-0')}>
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        'px-4 py-3 align-middle',
                        c.className,
                        c.hideOnMobile && 'hidden md:table-cell',
                      )}
                    >
                      <SkeletonLine className="h-4 w-full max-w-[160px]" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-2.5 sm:hidden">
          {[...Array(rows)].map((_, i) => (
            <div key={i} className={cn('mb-2.5 rounded-[12px] border p-4', cardBorder)}>
              <SkeletonLine className="mb-2 h-5 w-2/3" />
              <SkeletonLine className="mb-2 h-4 w-1/2" />
              <SkeletonLine className="h-3 w-1/3" />
            </div>
          ))}
        </div>
      </>
    );
  }

  const defaultEmpty = (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <Inbox className={cn('h-10 w-10', isLight ? 'text-gray-300' : 'text-white/40')} aria-hidden />
      <p className={cn('text-sm', isLight ? 'text-gray-500' : 'text-white/50')}>Нет данных</p>
    </div>
  );

  if (data.length === 0) {
    return <>{emptyState ?? defaultEmpty}</>;
  }

  return (
    <>
      <div className={tableWrap}>
        <table className="w-full border-separate border-spacing-0 text-[0.9375rem]">
          <thead className={theadBg}>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    'px-4 py-2.5 text-left align-middle text-[0.75rem] font-medium uppercase tracking-[0.05em]',
                    thText,
                    thBorder,
                    'whitespace-nowrap',
                    col.headerClassName,
                    col.hideOnMobile && 'hidden md:table-cell',
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr
                key={keyExtractor(item)}
                className={cn(
                  trBorder,
                  'transition-[background] duration-150 ease-out last:border-b-0',
                  trHover,
                  onRowClick && 'cursor-pointer',
                )}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onRowClick(item);
                        }
                      }
                    : undefined
                }
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? 'button' : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-3 align-middle',
                      tdText,
                      col.className,
                      col.hideOnMobile && 'hidden md:table-cell',
                    )}
                  >
                    {col.render(item, index)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2.5 sm:hidden">
        {data.map((item) => {
          const k = keyExtractor(item);
          return (
            <div
              key={k}
              className={cn(
                'mb-[10px] flex flex-col gap-2 rounded-[12px] border p-4',
                cardBorder,
                onRowClick && 'cursor-pointer',
              )}
              onClick={onRowClick ? () => onRowClick(item) : undefined}
              role={onRowClick ? 'button' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onRowClick(item);
                      }
                    }
                  : undefined
              }
            >
              <div className="flex items-start justify-between gap-2">
                <div className={cn('min-w-0 font-medium', isLight ? 'text-gray-900' : 'text-white')}>
                  {mobileCard.title(item)}
                </div>
                {mobileCard.badge ? <div className="shrink-0">{mobileCard.badge(item)}</div> : null}
              </div>
              {mobileCard.subtitle ? (
                <div className={cn('text-sm', isLight ? 'text-gray-600' : 'text-white/60')}>
                  {mobileCard.subtitle(item)}
                </div>
              ) : null}
              {mobileCard.meta ? (
                <div className={cn('text-[0.8125rem]', isLight ? 'text-gray-500' : 'text-white/40')}>
                  {mobileCard.meta(item)}
                </div>
              ) : null}
              {mobileCard.actions ? (
                <div
                  className={cn(
                    'mt-1 flex flex-wrap gap-2 border-t border-white/[0.07] pt-3',
                    isLight && 'border-gray-200',
                  )}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  {mobileCard.actions(item)}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
}
