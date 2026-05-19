'use client';

import { AlertCircle, Check } from 'lucide-react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { forwardRef, useId } from 'react';
import type { EmployerFormVariant } from '@/components/forms/form-styles';
import { formHelperRowCn } from '@/components/forms/form-styles';
import { cn } from '@/lib/utils';

interface FormCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label: ReactNode;
  helper?: string;
  error?: string;
  variant?: EmployerFormVariant;
}

/** Кастомный чекбокс 18×18 (кабинет: бордер/заливка emerald при checked). */
export const FormCheckbox = forwardRef<HTMLInputElement, FormCheckboxProps>(
  ({ label, helper, error, variant = 'default', className, disabled, id, ...props }, ref) => {
    const autoId = useId();
    const fieldId = id ?? `fcb-${autoId}`;

    return (
      <div className={cn('flex gap-3', className)}>
        <div className="relative mt-[2px] inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center">
          <input
            ref={ref}
            id={fieldId}
            type="checkbox"
            disabled={disabled}
            {...props}
            className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          />
          <span
            aria-hidden
            className={cn(
              'pointer-events-none flex h-[18px] w-[18px] items-center justify-center rounded border transition-all duration-150 peer-checked:[&>svg]:opacity-100',
              variant === 'cabinet'
                ? 'border-white/20 bg-transparent peer-checked:border-[color:var(--u-emerald,#2d6a4a)] peer-checked:bg-[color:var(--u-emerald,#2d6a4a)] peer-focus-visible:shadow-[0_0_0_3px_rgba(45,106,74,0.25)] peer-disabled:opacity-45'
                : 'border-gray-300 bg-white peer-checked:border-primary-600 peer-checked:bg-primary-600 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-disabled:opacity-50',
            )}
          >
            <Check className="h-3 w-3 text-white opacity-0 transition-opacity duration-150" strokeWidth={3} />
          </span>
        </div>
        <div className="min-w-0 flex-1 pt-px">
          <label htmlFor={fieldId} className={cn('block cursor-pointer leading-snug', labelText(variant))}>
            {label}
          </label>
          {!error && helper && <p className={cn(formHelperRowCn(variant), 'mt-1')}>{helper}</p>}
          {error && (
            <p role="alert" className={formHelperRowCn(variant, true)}>
              <AlertCircle className="mt-[2px] h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{error}</span>
            </p>
          )}
        </div>
      </div>
    );
  },
);
FormCheckbox.displayName = 'FormCheckbox';

function labelText(variant: EmployerFormVariant) {
  return variant === 'cabinet' ? 'text-sm text-white/85' : 'text-sm text-gray-800';
}
