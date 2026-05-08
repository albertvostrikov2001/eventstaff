'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

export function LegacyChatRoomRedirectClient() {
  const router = useRouter();
  const params = useParams<{ roomId: string }>();
  const { user, isInitialized } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) return;
    const base = user?.activeRole === 'employer' ? '/employer/messages' : '/worker/messages';
    router.replace(`${base}/${params.roomId}`);
  }, [user, isInitialized, router, params.roomId]);

  return null;
}
