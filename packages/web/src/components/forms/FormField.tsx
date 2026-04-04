'use client';

import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { forwardRef } from 'react';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, hint, id, ...props }, ref) => {
    const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-');
    return (
      <div>
        <label htmlFor={fieldId} className="block text-sm font-medium text-gray-700">
          {label}
          {props.required && <span className="ml-1 text-error">*</span>}
        </label>
        <input
          ref={ref}
          id={fieldId}
          {...props}
          className={`mt-1 block w-full rounded-input border px-3 py-2.5 text-sm shadow-sm transition focus:outline-none focus:ring-1 ${
            error
              ? 'border-error focus:border-error focus:ring-error'
              : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
          } ${props.className ?? ''}`}
        />
        {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
        {error && <p className="mt-1 text-xs text-error">{error}</p>}
      </div>
    );
  },
);
FormField.displayName = 'FormField';

interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ label, error, hint, id, ...props }, ref) => {
    const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-');
    return (
      <div>
        <label htmlFor={fieldId} className="block text-sm font-medium text-gray-700">
          {label}
          {props.required && <span className="ml-1 text-error">*</span>}
        </label>
        <textarea
          ref={ref}
          id={fieldId}
          {...props}
          rows={props.rows ?? 4}
          className={`mt-1 block w-full rounded-input border px-3 py-2.5 text-sm shadow-sm transition focus:outline-none focus:ring-1 ${
            error
              ? 'border-error focus:border-error focus:ring-error'
              : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
          } ${props.className ?? ''}`}
        />
        {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
        {error && <p className="mt-1 text-xs text-error">{error}</p>}
      </div>
    );
  },
);
FormTextarea.displayName = 'FormTextarea';

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ label, error, hint, id, options, placeholder, ...props }, ref) => {
    const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-');
    return (
      <div>
        <label htmlFor={fieldId} className="block text-sm font-medium text-gray-700">
          {label}
          {props.required && <span className="ml-1 text-error">*</span>}
        </label>
        <select
          ref={ref}
          id={fieldId}
          {...props}
          className={`mt-1 block w-full rounded-input border px-3 py-2.5 text-sm shadow-sm transition focus:outline-none focus:ring-1 ${
            error
              ? 'border-error focus:border-error focus:ring-error'
              : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
          } ${props.className ?? ''}`}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
        {error && <p className="mt-1 text-xs text-error">{error}</p>}
      </div>
    );
  },
);
FormSelect.displayName = 'FormSelect';

interface FormCheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: React.ReactNode;
  error?: string;
}

export const FormCheckbox = forwardRef<HTMLInputElement, FormCheckboxProps>(
  ({ label, error, id, ...props }, ref) => {
    const fieldId = id ?? String(label).toLowerCase().replace(/\s+/g, '-');
    return (
      <div>
        <label htmlFor={fieldId} className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            ref={ref}
            type="checkbox"
            id={fieldId}
            {...props}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
          />
          <span>{label}</span>
        </label>
        {error && <p className="mt-1 text-xs text-error">{error}</p>}
      </div>
    );
  },
);
FormCheckbox.displayName = 'FormCheckbox';
