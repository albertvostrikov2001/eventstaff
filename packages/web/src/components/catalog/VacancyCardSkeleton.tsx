export function VacancyCardSkeleton() {
  return (
    <div className="rounded-card border border-white/[0.08] bg-white/[0.04] p-5">
      {/* Title */}
      <div className="skeleton-light mb-1 h-5 w-4/5 rounded" />
      {/* Company */}
      <div className="skeleton-light mt-2 h-3.5 w-1/2 rounded" />
      {/* Badges */}
      <div className="mt-4 flex flex-wrap gap-2">
        <div className="skeleton-light h-5 w-20 rounded-full" />
        <div className="skeleton-light h-5 w-16 rounded-full" />
        <div className="skeleton-light h-5 w-24 rounded-full" />
      </div>
      {/* Rate + location row */}
      <div className="mt-4 flex items-center justify-between">
        <div className="skeleton-light h-4 w-24 rounded" />
        <div className="skeleton-light h-4 w-20 rounded" />
      </div>
    </div>
  );
}
