export function WorkerCardSkeleton() {
  return (
    <div className="rounded-card border border-white/[0.08] bg-white/[0.04] p-5">
      {/* Avatar + name row */}
      <div className="flex items-center gap-3">
        <div className="skeleton-light h-12 w-12 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton-light h-4 w-3/4 rounded" />
          <div className="skeleton-light h-3 w-1/2 rounded" />
        </div>
      </div>
      {/* Badges */}
      <div className="mt-4 flex flex-wrap gap-2">
        <div className="skeleton-light h-5 w-20 rounded-full" />
        <div className="skeleton-light h-5 w-16 rounded-full" />
        <div className="skeleton-light h-5 w-24 rounded-full" />
      </div>
      {/* Rate & rating row */}
      <div className="mt-4 flex items-center justify-between">
        <div className="skeleton-light h-4 w-28 rounded" />
        <div className="skeleton-light h-4 w-12 rounded" />
      </div>
    </div>
  );
}
