import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        /* Primary — emerald filled */
        primary:
          'bg-[#2d6a4a] text-white hover:bg-[#3d8a62] active:bg-[#2d6a4a] hover:-translate-y-px active:translate-y-0 hover:shadow-[0_4px_20px_rgba(45,106,74,0.35)] focus-visible:ring-[#2d6a4a]',
        /* Secondary — outlined white (for dark backgrounds) */
        secondary:
          'border border-white/20 bg-transparent text-white hover:border-white/40 hover:bg-white/06 focus-visible:ring-white',
        /* Outline — for light backgrounds */
        outline:
          'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100 focus-visible:ring-[#2d6a4a]',
        /* Ghost */
        ghost:
          'text-gray-700 hover:bg-gray-100 active:bg-gray-200 focus-visible:ring-[#2d6a4a]',
        /* Danger */
        danger:
          'bg-error text-white hover:bg-red-600 active:bg-red-700 focus-visible:ring-red-500',
        /* Link */
        link:
          'text-[#2d6a4a] underline-offset-4 hover:underline p-0 h-auto font-medium focus-visible:ring-[#2d6a4a]',
      },
      size: {
        sm: 'h-8 rounded-[6px] px-3 text-xs',
        md: 'h-10 rounded-[12px] px-4 text-sm',
        lg: 'h-12 rounded-[12px] px-6 text-base',
        icon: 'h-10 w-10 rounded-[12px]',
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
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
