import type { ReactNode } from 'react';
import { EmployerDashboardShell } from '@/components/layout/EmployerDashboardShell';

export default function EmployerLayout({ children }: { children: ReactNode }) {
  return <EmployerDashboardShell>{children}</EmployerDashboardShell>;
}
