import { cn } from '@/lib/utils';

export type EmployerFormVariant = 'default' | 'cabinet';
export type EmployerFieldTone = 'default' | 'error' | 'success';

export function employerFormSectionTitleClass(variant: EmployerFormVariant) {
  return variant === 'cabinet'
    ? 'mb-5 text-xs font-semibold uppercase tracking-[0.12em] text-white/40'
    : 'mb-4 text-base font-semibold text-gray-900';
}

export function employerFormSectionShellClass(variant: EmployerFormVariant) {
  return variant === 'cabinet'
    ? 'rounded-[14px] border border-white/[0.08] bg-white/[0.04] p-6'
    : 'rounded-card border border-gray-200 bg-white p-6 shadow-sm';
}

export function employerFormHeadingClass(variant: EmployerFormVariant) {
  return variant === 'cabinet'
    ? 'text-2xl font-bold text-white'
    : 'text-2xl font-bold text-gray-900';
}

export function employerFormSubheadingClass(variant: EmployerFormVariant) {
  return variant === 'cabinet'
    ? 'mt-1 text-sm text-white/55'
    : 'mt-1 text-sm text-gray-500';
}

export function formLabelCn(variant: EmployerFormVariant) {
  return variant === 'cabinet'
    ? 'mb-1.5 block text-[0.8125rem] font-medium tracking-[0.01em] text-white/70'
    : 'mb-1.5 block text-sm font-medium text-gray-700';
}

export function formRequiredAsteriskCn(variant: EmployerFormVariant) {
  return variant === 'cabinet'
    ? 'ml-0.5 text-[color:var(--u-emerald-light,#3d8a62)]'
    : 'ml-0.5 text-error';
}

const cabinetControlBase =
  'w-full rounded-[10px] border px-[14px] py-3 text-[0.9375rem] transition-all duration-150 ease-linear outline-none text-white bg-white/[0.04] border-white/[0.12] placeholder:text-white/30 [color-scheme:dark]';

const defaultControlBase =
  'mt-1 block w-full rounded-input border px-3 py-2.5 text-sm shadow-sm transition focus:outline-none focus:ring-1';

/** Стилизованный контрол: текстовые поля, select, textarea (без mt). */
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
        ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500'
        : tone === 'error'
          ? 'border-error focus:border-error focus:ring-error'
          : tone === 'success'
            ? 'border-success focus:border-success focus:ring-success'
            : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500',
      className,
    );
  }

  return cn(
    cabinetControlBase,
    !disabled &&
      'hover:border-white/20 hover:bg-white/[0.06] focus:border-[color:var(--u-emerald,#2d6a4a)] focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(45,106,74,0.25)] focus:outline-none',
    disabled &&
      'cursor-not-allowed bg-white/[0.02] text-white/40 border-white/[0.08] placeholder:text-white/20',
    tone === 'error' &&
      '!border-[#ef4444] shadow-[0_0_0_3px_rgba(239,68,68,0.15)] focus:border-[#ef4444]',
    tone === 'success' &&
      '!border-[color:var(--u-emerald-light,#3d8a62)] shadow-[0_0_0_3px_rgba(45,106,74,0.15)] focus:border-[color:var(--u-emerald-light,#3d8a62)]',
    className,
  );
}

export function formHelperRowCn(variant: EmployerFormVariant, isError?: boolean) {
  if (isError) return 'mt-1.5 flex items-start gap-1 text-[0.8125rem] leading-snug text-[#ef4444]';
  return variant === 'cabinet'
    ? 'mt-1.5 text-[0.8125rem] text-white/40'
    : 'mt-1.5 text-xs text-gray-500';
}
