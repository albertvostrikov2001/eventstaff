import type { ReactNode } from 'react';
import { EmployerDashboardShell } from '@/components/layout/EmployerDashboardShell';
import { RoleLayoutGuard } from '@/components/layout/RoleLayoutGuard';

export default function EmployerLayout({ children }: { children: ReactNode }) {
  return (
    <RoleLayoutGuard allowedRole="employer">
      <EmployerDashboardShell>{children}</EmployerDashboardShell>
    </RoleLayoutGuard>
  );
}
