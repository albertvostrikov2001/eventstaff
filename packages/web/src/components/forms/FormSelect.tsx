'use client';

import { AlertCircle } from 'lucide-react';
import type { SelectHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import type { EmployerFieldTone, EmployerFormVariant } from '@/components/forms/form-styles';
import {
  formControlCn,
  formHelperRowCn,
  formLabelCn,
  formRequiredAsteriskCn,
} from '@/components/forms/form-styles';
import { cn } from '@/lib/utils';

export interface SelectOption<T extends string | number = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface FormSelectOwnProps<T extends string | number = string>
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label: string;
  options?: SelectOption<T>[];
  children?: SelectHTMLAttributes<HTMLSelectElement>['children'];
  helper?: string;
  error?: string;
  variant?: EmployerFormVariant;
  visuallySuccess?: boolean;
  placeholder?: string;
  placeholderDisabled?: boolean;
}

/** Нативный select с общими классами. Дочерние `option` или `options`-массив. */
export const FormSelect = forwardRef<
  HTMLSelectElement,
  FormSelectOwnProps<string | number>
>(function FormSelect(props, ref) {
  const {
    label,
    options,
    children,
    error,
    helper,
    variant = 'default',
    visuallySuccess,
    required,
    className,
    id,
    disabled,
    placeholder,
    placeholderDisabled = true,
    ...rest
  } = props;
  const fieldId =
    id ?? (typeof rest.name === 'string' ? rest.name : undefined) ??
    label.replace(/\s+/g, '-').toLowerCase();
  const tone: EmployerFieldTone = error ? 'error' : visuallySuccess ? 'success' : 'default';
  const isRequired = Boolean(required);

  return (
    <div className={variant === 'cabinet' ? 'min-w-0' : ''}>
      <label htmlFor={fieldId} className={formLabelCn(variant)}>
        <span>{label}</span>
        {isRequired && <span className={formRequiredAsteriskCn(variant)} aria-hidden>*</span>}
      </label>
      <select
        ref={ref}
        id={fieldId}
        required={required}
        disabled={disabled}
        {...rest}
        aria-invalid={error ? true : undefined}
        className={cn(
          formControlCn(variant, tone, { disabled }),
          variant === 'cabinet' ? 'cabinet-select-chevron' : '',
          className,
        )}
      >
        {placeholder != null && (
          <option value="" disabled={placeholderDisabled}>
            {placeholder}
          </option>
        )}
        {children ??
          options?.map(opt => (
            <option key={String(opt.value)} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
      </select>

      {!error && helper && <p className={formHelperRowCn(variant)}>{helper}</p>}
      {error && (
        <p role="alert" className={formHelperRowCn(variant, true)}>
          <AlertCircle className="mt-[2px] h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
});
