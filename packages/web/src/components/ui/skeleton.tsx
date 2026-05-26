import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[var(--r-2)]',
        'bg-[var(--skeleton-base,#f3f4f6)]',
        'before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer',
        'before:bg-gradient-to-r before:from-transparent',
        'before:via-[var(--skeleton-highlight,rgba(255,255,255,.55))]',
        'before:to-transparent',
        className,
      )}
      {...props}
    />
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-[var(--r-5)] border border-[var(--card-border,rgba(0,0,0,.08))] bg-[var(--card-bg,#fff)] p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-[var(--r-1)]" />
        <Skeleton className="h-6 w-20 rounded-[var(--r-1)]" />
      </div>
    </div>
  );
}

export { Skeleton, SkeletonCard };
