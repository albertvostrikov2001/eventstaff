'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { disconnectSocket, getExistingSocket, getSocket } from '@/lib/socket';
import { getPublicApiBase } from '@/lib/api/publicApiBase';
import { useAuthStore } from '@/stores/authStore';
import { useChatInboxStore } from '@/stores/chatInboxStore';

const ChatSocketContext = createContext<Socket | null>(null);

export const useChatSocket = () => useContext(ChatSocketContext);

const MAX_ATTEMPTS = 5;

/**
 * Real-time чат: счётчик непрочитанных и WebSocket. Один сокет на сессию.
 */
export function ChatInboxProvider({ children }: { children: React.ReactNode }) {
  const { user, isInitialized } = useAuthStore();
  const setUnread = useChatInboxStore((s) => s.setUnreadTotal);
  const setConnection = useChatInboxStore((s) => s.setConnection);
  const setReconnectAttempt = useChatInboxStore((s) => s.setReconnectAttempt);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!isInitialized || !user) {
      setConnection('disconnected');
      return;
    }
    if (user.activeRole !== 'worker' && user.activeRole !== 'employer') {
      return;
    }

    const base = getPublicApiBase();
    if (!base) {
      return;
    }

    const s = getSocket();
    setConnection('connecting');

    s.io.on('reconnect_attempt', (attempt: number) => {
      setReconnectAttempt(attempt);
      setConnection('reconnecting');
    });
    s.io.on('reconnect', () => {
      setConnection('connected');
      setReconnectAttempt(0);
    });
    s.io.on('reconnect_failed', () => {
      setConnection('failed');
    });
    s.on('disconnect', (reason) => {
      if (reason === 'io client disconnect') {
        setConnection('disconnected');
      } else {
        setConnection('reconnecting');
      }
    });
    s.on('connect_error', (err) => {
      console.warn('Socket connect_error:', err.message);
      if (err.message === 'UNAUTHORIZED') {
        setConnection('failed');
      } else {
        setConnection('reconnecting');
      }
    });

    s.on('unread:update', (p: { total: number }) => {
      setUnread(p.total);
    });

    const onConnect = () => {
      setConnection('connected');
      setReconnectAttempt(0);
      setSocket(s);
    };
    s.on('connect', onConnect);
    if (s.connected) onConnect();

    void fetch(`${base}/chat/unread`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.data?.total !== undefined) setUnread(j.data.total);
      })
      .catch(() => {});

    return () => {
      s.removeAllListeners();
      disconnectSocket();
      setSocket(null);
      setConnection('disconnected');
      setReconnectAttempt(0);
    };
  }, [isInitialized, user, setUnread, setConnection, setReconnectAttempt]);

  const v = useMemo(() => socket ?? getExistingSocket(), [socket]);
  return <ChatSocketContext.Provider value={v}>{children}</ChatSocketContext.Provider>;
}

export { MAX_ATTEMPTS };
