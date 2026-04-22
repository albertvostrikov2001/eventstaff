'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getPublicApiBase } from '@/lib/api/publicApiBase';
import { getApiOriginForSocket } from '@/lib/chat/api-origin';
import { useAuthStore } from '@/stores/authStore';
import { useChatInboxStore } from '@/stores/chatInboxStore';

const ChatSocketContext = createContext<Socket | null>(null);

export const useChatSocket = () => useContext(ChatSocketContext);

/**
 * Real-time чат: счётчик непрочитанных и WebSocket. Один сокет на сессию.
 */
export function ChatInboxProvider({ children }: { children: React.ReactNode }) {
  const { user, isInitialized } = useAuthStore();
  const setUnread = useChatInboxStore((s) => s.setUnreadTotal);
  const setConnection = useChatInboxStore((s) => s.setConnection);
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
    const origin = getApiOriginForSocket();
    if (!base || !origin) {
      return;
    }

    const s = io(`${origin}/chat`, {
      path: '/socket.io/',
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
    });

    setConnection('connecting');

    s.io.on('reconnect_attempt', () => {
      setConnection('reconnecting');
    });
    s.io.on('reconnect', () => {
      setConnection('connected');
    });
    s.io.on('reconnect_error', () => {
      setConnection('reconnecting');
    });
    s.on('disconnect', () => {
      setConnection('disconnected');
    });
    s.on('connect_error', () => {
      setConnection('disconnected');
    });

    s.on('unread:update', (p: { total: number }) => {
      setUnread(p.total);
    });

    const onConnect = () => {
      setConnection('connected');
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
      s.disconnect();
      setSocket(null);
      setConnection('disconnected');
    };
  }, [isInitialized, user?.id, user?.activeRole, setUnread, setConnection]);

  const v = useMemo(() => socket, [socket]);
  return <ChatSocketContext.Provider value={v}>{children}</ChatSocketContext.Provider>;
}
