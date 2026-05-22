import type { ReactNode } from 'react';
import { WorkerDashboardShell } from '@/components/layout/WorkerDashboardShell';
import { RoleLayoutGuard } from '@/components/layout/RoleLayoutGuard';

export default function WorkerLayout({ children }: { children: ReactNode }) {
  return (
    <RoleLayoutGuard allowedRole="worker">
      <WorkerDashboardShell>{children}</WorkerDashboardShell>
    </RoleLayoutGuard>
  );
}
