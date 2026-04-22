import { create } from 'zustand';

type Conn = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export const useChatInboxStore = create<{
  unreadTotal: number;
  connection: Conn;
  setUnreadTotal: (n: number) => void;
  setConnection: (c: Conn) => void;
}>((set) => ({
  unreadTotal: 0,
  connection: 'disconnected',
  setUnreadTotal: (n) => set({ unreadTotal: n }),
  setConnection: (c) => set({ connection: c }),
}));
