'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

/** Легаси: /dashboard/company/media → кабинет работодателя. */
export default function DashboardCompanyMediaRedirectPage() {
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) return;
    router.replace('/employer/profile/media');
  }, [router, user, isInitialized]);

  return <p className="p-6 text-sm text-gray-500">Перенаправление…</p>;
}
