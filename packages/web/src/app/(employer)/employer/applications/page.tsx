import { Suspense } from 'react';
import { EmployerApplicationsPageClient } from './EmployerApplicationsPageClient';

function ApplicationsFallback() {
  return (
    <div className="text-white">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-white/10" />
      <div className="mt-4 h-4 w-96 max-w-full animate-pulse rounded bg-white/10" />
      <div className="mt-8 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[88px] animate-pulse rounded-[14px] border border-white/[0.08] bg-white/[0.04]" />
        ))}
      </div>
    </div>
  );
}

export default function EmployerApplicationsPage() {
  return (
    <Suspense fallback={<ApplicationsFallback />}>
      <EmployerApplicationsPageClient />
    </Suspense>
  );
}
