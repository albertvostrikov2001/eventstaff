import { create } from 'zustand';

type Conn = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'failed';

export const useChatInboxStore = create<{
  unreadTotal: number;
  connection: Conn;
  reconnectAttempt: number;
  setUnreadTotal: (n: number) => void;
  setConnection: (c: Conn) => void;
  setReconnectAttempt: (n: number) => void;
}>((set) => ({
  unreadTotal: 0,
  connection: 'disconnected',
  reconnectAttempt: 0,
  setUnreadTotal: (n) => set({ unreadTotal: n }),
  setConnection: (c) => set({ connection: c }),
  setReconnectAttempt: (n) => set({ reconnectAttempt: n }),
}));
