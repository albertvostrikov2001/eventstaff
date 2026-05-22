'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

export function LegacyChatRoomRedirectClient({ roomId }: { roomId: string }) {
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) return;
    const base = user?.activeRole === 'employer' ? '/employer/messages' : '/worker/messages';
    router.replace(`${base}/${roomId}`);
  }, [user, isInitialized, router, roomId]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-emerald-400" />
    </div>
  );
}
