import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-[var(--r-1)] px-2 py-0.5 font-mono text-[11px] font-medium tracking-[.04em] uppercase transition-colors',
  {
    variants: {
      variant: {
        /** Нейтральный */
        default:
          'bg-[rgba(106,118,112,.14)] text-[var(--text-muted)]',
        /** Акцентный emerald */
        primary:
          'border border-[var(--border-emerald)] bg-[var(--accent-faint)] text-[var(--accent)]',
        /** Для светлых страниц (deprecated alias → используй primary) */
        secondary:
          'bg-[rgba(106,118,112,.10)] text-[var(--ink-secondary)]',
        /** Успех */
        success:
          'bg-[var(--state-success-bg)] text-[var(--state-success)]',
        /** Предупреждение */
        warning:
          'bg-[var(--state-warning-bg)] text-[var(--state-warning)]',
        /** Ошибка */
        error:
          'bg-[var(--state-danger-bg)] text-[var(--state-danger)]',
        /** Информация */
        info:
          'bg-[var(--state-info-bg)] text-[var(--state-info)]',
        /** Фиолетовый */
        violet:
          'bg-[rgba(160,120,200,.14)] text-[#c4a4d9]',
        /** Обводка без фона */
        outline:
          'border border-[var(--border-default)] text-[var(--text-secondary)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
