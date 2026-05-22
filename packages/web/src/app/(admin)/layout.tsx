import type { ReactNode } from 'react';
import { AdminDashboardShell } from '@/components/layout/AdminDashboardShell';
import { RoleLayoutGuard } from '@/components/layout/RoleLayoutGuard';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RoleLayoutGuard allowedRole="admin">
      <AdminDashboardShell>{children}</AdminDashboardShell>
    </RoleLayoutGuard>
  );
}
