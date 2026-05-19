'use client';

import { AlertCircle } from 'lucide-react';
import type { TextareaHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import type { EmployerFieldTone, EmployerFormVariant } from '@/components/forms/form-styles';
import {
  formControlCn,
  formHelperRowCn,
  formLabelCn,
  formRequiredAsteriskCn,
} from '@/components/forms/form-styles';
import { cn } from '@/lib/utils';

interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  helper?: string;
  /** Показать символ счётчик справа от label (если есть maxLength) */
  showCounter?: boolean;
  counterValue?: number;
  counterMax?: number;
  error?: string;
  variant?: EmployerFormVariant;
  visuallySuccess?: boolean;
}

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  (
    {
      label,
      error,
      helper,
      variant = 'default',
      visuallySuccess,
      required,
      className,
      id,
      disabled,
      showCounter,
      counterValue,
      counterMax,
      maxLength,
      ...props
    },
    ref,
  ) => {
    const fieldId = id ?? props.name ?? label.replace(/\s+/g, '-').toLowerCase();
    const tone: EmployerFieldTone = error ? 'error' : visuallySuccess ? 'success' : 'default';
    const isRequired = Boolean(required);
    const max = counterMax ?? maxLength;
    const show =
      showCounter && typeof max === 'number' && typeof counterValue === 'number';

    return (
      <div className={variant === 'cabinet' ? 'min-w-0' : ''}>
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <label htmlFor={fieldId} className={cn(formLabelCn(variant), 'mb-0')}>
            <span>{label}</span>
            {isRequired && <span className={formRequiredAsteriskCn(variant)} aria-hidden>*</span>}
          </label>
          {show && (
            <span
              className={
                variant === 'cabinet'
                  ? 'text-[0.75rem] tabular-nums text-white/45'
                  : 'text-xs tabular-nums text-gray-500'
              }
            >
              {counterValue}/{max}
            </span>
          )}
        </div>
        <textarea
          ref={ref}
          id={fieldId}
          required={required}
          disabled={disabled}
          maxLength={maxLength}
          {...props}
          aria-invalid={error ? true : undefined}
          className={cn(
            formControlCn(variant, tone, { disabled }),
            'min-h-[100px] resize-y',
            className,
          )}
        />

        {!error && helper && <p className={formHelperRowCn(variant)}>{helper}</p>}
        {error && (
          <p role="alert" className={formHelperRowCn(variant, true)}>
            <AlertCircle className="mt-[2px] h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  },
);
FormTextarea.displayName = 'FormTextarea';
