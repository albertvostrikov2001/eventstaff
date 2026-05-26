import { cn } from '@/lib/utils';

export type EmployerFormVariant = 'default' | 'cabinet';
export type EmployerFieldTone = 'default' | 'error' | 'success';

export function employerFormSectionTitleClass(variant: EmployerFormVariant) {
  return variant === 'cabinet'
    ? 'mb-4 font-mono text-[11px] font-medium uppercase tracking-[.10em] text-[var(--text-muted)]'
    : 'mb-4 text-base font-semibold text-gray-900';
}

export function employerFormSectionShellClass(variant: EmployerFormVariant) {
  return variant === 'cabinet'
    ? 'rounded-[var(--r-5)] border border-[var(--border-subtle)] bg-[var(--card-bg,rgba(255,255,255,.04))] p-6'
    : 'rounded-[var(--r-5)] border border-[var(--card-border,rgba(0,0,0,.08))] bg-[var(--card-bg,#fff)] p-6 shadow-sm';
}

export function employerFormHeadingClass(variant: EmployerFormVariant) {
  return variant === 'cabinet'
    ? 'text-2xl font-medium tracking-[-0.01em] text-[var(--text-primary)]'
    : 'text-2xl font-medium tracking-[-0.01em] text-[var(--ink-primary)]';
}

export function employerFormSubheadingClass(variant: EmployerFormVariant) {
  return variant === 'cabinet'
    ? 'mt-1 text-sm text-[var(--text-secondary)]'
    : 'mt-1 text-sm text-[var(--ink-secondary)]';
}

export function formLabelCn(variant: EmployerFormVariant) {
  return variant === 'cabinet'
    ? 'mb-1.5 flex items-center gap-1 text-[13px] font-medium text-[var(--text-primary)]'
    : 'mb-1.5 flex items-center gap-1 text-sm font-medium text-[var(--ink-primary)]';
}

export function formRequiredAsteriskCn(variant: EmployerFormVariant) {
  return variant === 'cabinet'
    ? 'ml-0.5 text-[var(--accent)]'
    : 'ml-0.5 text-[var(--state-danger)]';
}

const cabinetControlBase =
  'w-full rounded-[var(--r-2)] border px-3.5 py-2.5 text-[14px] leading-snug transition-[border-color,box-shadow] duration-[var(--d-micro)] outline-none ' +
  'bg-[rgba(255,255,255,.03)] border-[var(--border-default)] text-[var(--text-primary)] ' +
  'placeholder:text-[var(--text-muted)] [color-scheme:dark]';

const defaultControlBase =
  'block w-full rounded-[var(--r-2)] border px-3.5 py-2.5 text-sm transition-[border-color,box-shadow] duration-[var(--d-micro)] outline-none ' +
  'bg-white border-[rgba(0,0,0,.10)] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)]';

export function formControlCn(
  variant: EmployerFormVariant,
  tone: EmployerFieldTone,
  opts: { disabled?: boolean; className?: string } = {},
) {
  const { disabled, className } = opts;

  if (variant === 'default') {
    return cn(
      defaultControlBase,
      disabled
        ? 'cursor-not-allowed border-[rgba(0,0,0,.06)] bg-gray-50 text-[var(--ink-muted)]'
        : tone === 'error'
          ? 'border-[var(--state-danger)] focus:border-[var(--state-danger)] focus:ring-[3px] focus:ring-[var(--state-danger-bg)]'
          : tone === 'success'
            ? 'border-[var(--state-success)] focus:border-[var(--state-success)] focus:ring-[3px] focus:ring-[var(--state-success-bg)]'
            : 'focus:border-[var(--accent)] focus:ring-[3px] focus:ring-[var(--accent-faint)] hover:border-[rgba(0,0,0,.22)]',
      className,
    );
  }

  // cabinet variant
  return cn(
    cabinetControlBase,
    !disabled && [
      'hover:border-[var(--border-strong)] hover:bg-[rgba(255,255,255,.05)]',
      'focus:border-[var(--accent)] focus:bg-[rgba(255,255,255,.05)] focus:ring-[3px] focus:ring-[var(--accent-faint)]',
    ],
    disabled &&
      'cursor-not-allowed bg-[rgba(255,255,255,.02)] text-[var(--text-disabled)] border-[var(--border-subtle)] placeholder:text-[var(--text-disabled)]',
    tone === 'error' &&
      '!border-[var(--state-danger)] focus:ring-[3px] focus:ring-[var(--state-danger-bg)]',
    tone === 'success' &&
      '!border-[var(--state-success)] focus:ring-[3px] focus:ring-[var(--state-success-bg)]',
    className,
  );
}

export function formHelperRowCn(variant: EmployerFormVariant, isError?: boolean) {
  if (isError) {
    return 'mt-1.5 flex items-start gap-1 text-[13px] leading-snug text-[var(--state-danger)]';
  }
  return variant === 'cabinet'
    ? 'mt-1.5 text-[13px] text-[var(--text-muted)]'
    : 'mt-1.5 text-xs text-[var(--ink-muted)]';
}
