'use client';

/** @deprecated Legacy /dashboard/chat — use /worker/messages or /employer/messages */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

export default function LegacyChatRedirect() {
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) return;
    if (user?.activeRole === 'employer') {
      router.replace('/employer/messages');
    } else {
      router.replace('/worker/messages');
    }
  }, [user, isInitialized, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-emerald-400" />
    </div>
  );
}
