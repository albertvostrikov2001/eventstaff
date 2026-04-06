import type { ReactNode } from 'react';
import { AdminDashboardShell } from '@/components/layout/AdminDashboardShell';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminDashboardShell>{children}</AdminDashboardShell>;
}
