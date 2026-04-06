import type { ReactNode } from 'react';
import { WorkerDashboardShell } from '@/components/layout/WorkerDashboardShell';

export default function WorkerLayout({ children }: { children: ReactNode }) {
  return <WorkerDashboardShell>{children}</WorkerDashboardShell>;
}
