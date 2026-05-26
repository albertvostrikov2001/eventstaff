import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <textarea
          className={cn(
            'flex min-h-[80px] w-full rounded-[var(--r-2)] border px-3.5 py-2.5 text-sm leading-relaxed',
            'resize-vertical transition-[border-color,box-shadow] duration-[var(--d-micro)]',
            // adaptive colours
            'bg-[var(--input-bg,#fff)] text-[var(--input-color,var(--ink-primary))]',
            'border-[var(--input-border,rgba(0,0,0,.10))]',
            'placeholder:text-[var(--input-placeholder,var(--ink-muted))]',
            // states
            'hover:border-[var(--input-border-hover,rgba(0,0,0,.22))]',
            'focus-visible:outline-none focus-visible:border-[var(--accent)] focus-visible:ring-[3px] focus-visible:ring-[var(--accent-faint)]',
            'disabled:cursor-not-allowed disabled:opacity-40',
            error && 'border-[var(--state-danger)] focus-visible:ring-[var(--state-danger-bg)]',
            className,
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-[var(--state-danger)]">{error}</p>
        )}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea };
