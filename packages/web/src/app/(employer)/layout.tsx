import type { ReactNode } from 'react';
import { EmployerDashboardShell } from '@/components/layout/EmployerDashboardShell';
import { RoleLayoutGuard } from '@/components/layout/RoleLayoutGuard';
import { IosInstallTip } from '@/components/pwa/IosInstallTip';

export default function EmployerLayout({ children }: { children: ReactNode }) {
  return (
    <RoleLayoutGuard allowedRole="employer">
      <EmployerDashboardShell>{children}</EmployerDashboardShell>
      <IosInstallTip />
    </RoleLayoutGuard>
  );
}
