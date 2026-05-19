'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WorkerDashboardShell } from '@/components/layout/WorkerDashboardShell';
import { EmployerDashboardShell } from '@/components/layout/EmployerDashboardShell';
import { useAuthStore } from '@/stores/authStore';

export default function SharedDashboardLayout({ children }: { children: ReactNode }) {
  const { user, isInitialized, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isInitialized && !user) {
      router.replace('/auth/login');
    }
  }, [user, isLoading, isInitialized, router]);

  if (!isInitialized || isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-600">
        Загрузка…
      </div>
    );
  }

  if (user.activeRole === 'employer') {
    return <EmployerDashboardShell>{children}</EmployerDashboardShell>;
  }

  return <WorkerDashboardShell>{children}</WorkerDashboardShell>;
}
