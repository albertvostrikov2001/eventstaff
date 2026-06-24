import type { ReactNode } from 'react';
import { WorkerDashboardShell } from '@/components/layout/WorkerDashboardShell';
import { RoleLayoutGuard } from '@/components/layout/RoleLayoutGuard';
import { IosInstallTip } from '@/components/pwa/IosInstallTip';

export default function WorkerLayout({ children }: { children: ReactNode }) {
  return (
    <RoleLayoutGuard allowedRole="worker">
      <WorkerDashboardShell>{children}</WorkerDashboardShell>
      <IosInstallTip />
    </RoleLayoutGuard>
  );
}
