'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

const ChatInboxProvider = dynamic(
  () => import('@/components/chat/ChatInboxProvider').then((m) => m.ChatInboxProvider),
  { ssr: false },
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initAuth = useAuthStore((s) => s.initAuth);
  const user = useAuthStore((s) => s.user);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  useEffect(() => {
    const isMetaMaskStr = (val: unknown): boolean => {
      if (typeof val !== 'string') return false;
      return val.toLowerCase().includes('metamask');
    };

    const handleError = (event: ErrorEvent) => {
      const msg = event?.message ?? '';
      if (isMetaMaskStr(msg)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const msg =
        typeof reason === 'string'
          ? reason
          : reason instanceof Error
            ? reason.message
            : '';
      if (isMetaMaskStr(msg)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    window.addEventListener('error', handleError, true);
    window.addEventListener('unhandledrejection', handleUnhandledRejection, true);

    initAuth();

    return () => {
      window.removeEventListener('error', handleError, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection, true);
    };
  }, [initAuth]);

  const needsChat =
    isInitialized &&
    user != null &&
    (user.activeRole === 'worker' || user.activeRole === 'employer' || user.activeRole === 'admin');

  if (needsChat) {
    return <ChatInboxProvider>{children}</ChatInboxProvider>;
  }

  return <>{children}</>;
}
