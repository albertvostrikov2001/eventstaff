'use client';

import { AlertCircle, UploadCloud } from 'lucide-react';
import type { ChangeEventHandler, InputHTMLAttributes, MutableRefObject, ReactNode } from 'react';
import { forwardRef, useCallback, useId, useRef } from 'react';
import type { EmployerFieldTone, EmployerFormVariant } from '@/components/forms/form-styles';
import {
  formControlCn,
  formHelperRowCn,
  formLabelCn,
  formRequiredAsteriskCn,
} from '@/components/forms/form-styles';
import { cn } from '@/lib/utils';

interface FormFileUploadProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'> {
  label: ReactNode;
  helper?: ReactNode;
  error?: string;
  variant?: EmployerFormVariant;
  visuallySuccess?: boolean;
  idleLabel?: string;
}

/**
 * Поле загрузки файла: видимый контрол в стиле input + скрытый `input[type=file]`.
 * Для react-hook-form: `{(field) => <FormFileUpload ... {...field} value={undefined} />} ` или `register` только на ref/name/onBlur.
 */
export const FormFileUpload = forwardRef<HTMLInputElement, FormFileUploadProps>(
  (
    {
      label,
      helper,
      error,
      variant = 'cabinet',
      visuallySuccess,
      required,
      id,
      disabled,
      idleLabel = 'Выберите файл…',
      multiple,
      onChange,
      name,
      accept,
      ...rest
    },
    forwardedRef,
  ) => {
    const uid = useId();
    const fieldId = id ?? `ff-${name ?? uid}`;
    const innerRef = useRef<HTMLInputElement | null>(null);
    const tone: EmployerFieldTone = error ? 'error' : visuallySuccess ? 'success' : 'default';
    const mergeRef = useCallback(
      (node: HTMLInputElement | null) => {
        innerRef.current = node;
        if (typeof forwardedRef === 'function') forwardedRef(node);
        else if (forwardedRef && 'current' in forwardedRef)
          (forwardedRef as MutableRefObject<HTMLInputElement | null>).current = node;
      },
      [forwardedRef],
    );

    const onInnerChange = useCallback<ChangeEventHandler<HTMLInputElement>>(
      event => {
        onChange?.(event);
      },
      [onChange],
    );

    const hint = idleLabel;

    return (
      <div className={variant === 'cabinet' ? 'min-w-0' : ''}>
        <label htmlFor={fieldId} className={formLabelCn(variant)}>
          <span>{label}</span>
          {(required ?? false) && <span className={formRequiredAsteriskCn(variant)} aria-hidden>*</span>}
        </label>

        <div className="relative">
          <input
            ref={mergeRef}
            id={fieldId}
            type="file"
            name={name}
            disabled={disabled}
            multiple={multiple}
            accept={accept}
            onChange={onInnerChange}
            className="sr-only"
            aria-invalid={error ? true : undefined}
            {...rest}
          />
          {/* Связка: видимый label и скрытый input с общим htmlFor */}
          <label
            htmlFor={fieldId}
            tabIndex={disabled ? undefined : 0}
            onKeyDown={e => {
              if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
                e.preventDefault();
                innerRef.current?.click();
              }
            }}
            className={cn(
              formControlCn(variant, tone, { disabled }),
              'flex cursor-pointer items-center gap-2',
              disabled && 'pointer-events-none',
            )}
          >
            <UploadCloud
              className={variant === 'cabinet' ? 'h-5 w-5 shrink-0 text-white/45' : 'h-5 w-5 shrink-0 text-gray-500'}
              aria-hidden
            />
            <span
              className={variant === 'cabinet' ? 'text-sm text-white/45' : 'text-sm text-gray-500'}
            >
              {hint}
            </span>
          </label>
        </div>

        {!error && helper && <div className={formHelperRowCn(variant)}>{helper}</div>}
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
FormFileUpload.displayName = 'FormFileUpload';
