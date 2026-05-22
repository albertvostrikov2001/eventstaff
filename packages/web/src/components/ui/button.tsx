import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-unity-gradient-primary text-white hover:bg-unity-gradient-primary-hover active:translate-y-0 active:shadow-none hover:shadow-[var(--u-shadow-primary-hover)] hover:-translate-y-px focus-visible:ring-[color:var(--u-emerald)]',
        /** Обводка emerald, текст emerald (тёмный кабинет) */
        secondary:
          'border border-emerald-500/55 bg-transparent text-emerald-200 hover:border-emerald-400/70 hover:bg-emerald-500/10 focus-visible:ring-[color:var(--u-emerald)]',
        /** Светлые страницы: серая рамка */
        outline:
          'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100 focus-visible:ring-[#2d6a4a]',
        /** Тёмный кабинет: белая полупрозрачная рамка */
        muted:
          'border border-white/20 bg-transparent text-white hover:border-white/35 hover:bg-white/[0.06] focus-visible:ring-white/40',
        /** Светлый ghost */
        ghost:
          'text-gray-700 hover:bg-gray-100 active:bg-gray-200 focus-visible:ring-[#2d6a4a] bg-transparent',
        /** Тёмный ghost: без фона, белый текст */
        ghostInverse:
          'bg-transparent text-white hover:bg-white/[0.06] focus-visible:ring-white/30 border-0 shadow-none',
        danger:
          'bg-error text-white hover:bg-red-600 active:bg-red-700 focus-visible:ring-red-500 border border-transparent',
        link:
          'border-0 bg-transparent p-0 h-auto font-medium text-[color:var(--u-emerald)] underline-offset-4 hover:underline focus-visible:ring-[color:var(--u-emerald)] shadow-none',
      },
      size: {
        sm: 'rounded-[6px] px-3 py-1.5 text-xs min-h-0',
        md: 'rounded-[12px] px-4 py-2.5 text-sm',
        lg: 'rounded-[12px] px-6 py-3 text-base',
        icon: 'h-10 w-10 rounded-[12px] p-0',
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
