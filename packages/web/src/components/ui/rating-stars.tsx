'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingStarsProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onChange?: (value: number) => void;
  className?: string;
}

const SIZE_MAP = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export function RatingStars({
  value,
  max = 5,
  size = 'md',
  interactive = false,
  onChange,
  className,
}: RatingStarsProps) {
  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {Array.from({ length: max }, (_, i) => {
        const filled = i < Math.floor(value);
        const halfFilled = !filled && i < value;

        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => onChange?.(i + 1)}
            className={cn(
              'transition-colors',
              interactive && 'cursor-pointer hover:scale-110',
              !interactive && 'cursor-default',
            )}
            aria-label={`${i + 1} из ${max}`}
          >
            <Star
              className={cn(
                SIZE_MAP[size],
                filled && 'fill-amber-400 text-amber-400',
                halfFilled && 'fill-amber-400/50 text-amber-400',
                !filled && !halfFilled && 'fill-gray-200 text-gray-200',
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
