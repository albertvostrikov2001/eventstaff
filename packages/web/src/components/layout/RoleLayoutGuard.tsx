'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import type { RoleKey } from '@unity/shared';

const ROLE_REDIRECTS: Record<RoleKey, string> = {
  worker: '/worker/dashboard',
  employer: '/employer/dashboard',
  admin: '/admin/dashboard',
  moderator: '/admin/dashboard',
};

function LoadingSkeleton() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-emerald-400" />
    </div>
  );
}

export function RoleLayoutGuard({
  allowedRole,
  children,
}: {
  allowedRole: RoleKey;
  children: ReactNode;
}) {
  const { user, isInitialized, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized || isLoading) return;
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    const ok =
      allowedRole === 'admin'
        ? user.roles.includes('admin')
        : user.activeRole === allowedRole || user.roles.includes(allowedRole);
    if (!ok) {
      const target = ROLE_REDIRECTS[user.activeRole] ?? '/auth/login';
      router.replace(target);
    }
  }, [user, isInitialized, isLoading, allowedRole, router]);

  if (!isInitialized || isLoading) return <LoadingSkeleton />;
  if (!user) return null;
  const ok =
    allowedRole === 'admin'
      ? user.roles.includes('admin')
      : user.activeRole === allowedRole || user.roles.includes(allowedRole);
  if (!ok) return null;

  return <>{children}</>;
}
