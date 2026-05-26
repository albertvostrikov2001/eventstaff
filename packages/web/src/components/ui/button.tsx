import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        /** Основная CTA — плоский accent #5bb880, тёмный текст */
        primary:
          'bg-[var(--accent)] text-[var(--text-on-accent)] hover:bg-[var(--accent-hover)] active:bg-[var(--accent-active)] focus-visible:ring-[var(--accent)]',
        /** Обводка emerald, текст emerald (тёмный кабинет) */
        secondary:
          'border border-[var(--border-emerald)] bg-transparent text-[var(--accent)] hover:border-[var(--accent)] hover:bg-[var(--accent-faint)] focus-visible:ring-[var(--accent)]',
        /** Светлые страницы: серая рамка на белом фоне */
        outline:
          'border border-[var(--border-ink)] bg-white text-[var(--ink-primary)] hover:bg-gray-50 active:bg-gray-100 focus-visible:ring-[var(--accent)]',
        /** Тёмный кабинет: полупрозрачная рамка */
        muted:
          'border border-[var(--border-default)] bg-[rgba(255,255,255,0.04)] text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[rgba(255,255,255,0.08)] focus-visible:ring-[var(--accent)]',
        /** Светлый ghost */
        ghost:
          'bg-transparent text-[var(--ink-secondary)] hover:bg-[rgba(0,0,0,0.04)] hover:text-[var(--ink-primary)] active:bg-[rgba(0,0,0,0.07)] focus-visible:ring-[var(--accent)]',
        /** Тёмный ghost */
        ghostInverse:
          'bg-transparent text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--text-primary)] focus-visible:ring-[var(--accent)] border-0 shadow-none',
        danger:
          'bg-[var(--state-danger-bg)] text-[var(--state-danger)] border border-[rgba(217,106,106,0.3)] hover:bg-[rgba(217,106,106,0.20)] focus-visible:ring-[var(--state-danger)]',
        link:
          'border-0 bg-transparent p-0 h-auto font-medium text-[var(--accent)] underline-offset-4 hover:underline focus-visible:ring-[var(--accent)] shadow-none',
      },
      size: {
        sm:   'h-8  rounded-[var(--r-3)] px-3 text-[13px]',
        md:   'h-10 rounded-[var(--r-4)] px-4 text-sm',
        lg:   'h-12 rounded-[var(--r-4)] px-[22px] text-[15px]',
        icon: 'h-10 w-10 rounded-[var(--r-4)] p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading,
      leftIcon,
      rightIcon,
      fullWidth,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';
    const busy = !!isLoading;

    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }), fullWidth && 'w-full')}
          ref={ref}
          {...props}
        >
          {children}
        </Comp>
      );
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }), fullWidth && 'w-full')}
        ref={ref}
        disabled={disabled ?? busy}
        aria-busy={busy}
        {...props}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
        ) : leftIcon ? (
          <span className="shrink-0 [&_svg]:h-4 [&_svg]:w-4">{leftIcon}</span>
        ) : null}
        {children}
        {!busy && rightIcon ? (
          <span className="shrink-0 [&_svg]:h-4 [&_svg]:w-4">{rightIcon}</span>
        ) : null}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
