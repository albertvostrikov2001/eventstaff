'use client';

import { AlertCircle } from 'lucide-react';
import type { InputHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import type { EmployerFieldTone, EmployerFormVariant } from '@/components/forms/form-styles';
import {
  formControlCn,
  formHelperRowCn,
  formLabelCn,
  formRequiredAsteriskCn,
} from '@/components/forms/form-styles';
import { cn } from '@/lib/utils';

export interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Текст подсказки под полем (не ошибка). */
  helper?: string;
  /** @deprecated используйте `helper` вместо `hint` */
  hint?: string;
  error?: string;
  variant?: EmployerFormVariant;
  /** Визуальный success-бордер/кольцо (например, после успешного blur). */
  visuallySuccess?: boolean;
}

/** Универсальное текстовое поле: label + input + ошибка/helper. Для работодателя: `variant="cabinet"` */
export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  (
    {
      label,
      error,
      helper,
      hint,
      variant = 'default',
      visuallySuccess,
      required,
      className,
      id,
      disabled,
      readOnly,
      ...props
    },
    ref,
  ) => {
    const fieldId = id ?? props.name ?? label.replace(/\s+/g, '-').toLowerCase();
    const helperText = helper ?? hint;
    const tone: EmployerFieldTone = error ? 'error' : visuallySuccess ? 'success' : 'default';
    const isRequired = Boolean(required);

    return (
      <div className={variant === 'cabinet' ? 'min-w-0' : ''}>
        <label htmlFor={fieldId} className={formLabelCn(variant)}>
          <span>{label}</span>
          {isRequired && <span className={formRequiredAsteriskCn(variant)} aria-hidden>*</span>}
        </label>
        <input
          ref={ref}
          id={fieldId}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          {...props}
          aria-invalid={error ? true : undefined}
          className={cn(
            formControlCn(variant, tone, { disabled }),
            readOnly &&
              variant === 'cabinet' &&
              '!cursor-default border-white/[0.08] bg-white/[0.03] text-white/85 [&:hover]:border-white/[0.12] [&:hover]:bg-white/[0.04]',
            readOnly &&
              variant === 'default' &&
              'cursor-default bg-gray-50 text-gray-700 [&:hover]:border-gray-300',
            className,
          )}
        />

        {!error && helperText && <p className={formHelperRowCn(variant)}>{helperText}</p>}
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
FormField.displayName = 'FormField';

export { FormTextarea } from './FormTextarea';
export { FormSelect } from './FormSelect';
export { FormCheckbox } from './FormCheckbox';
export { FormRadio } from './FormRadio';
export { FormDateTimePicker } from './FormDateTimePicker';
export { FormFileUpload } from './FormFileUpload';
