import { io, type Socket } from 'socket.io-client';
import { config } from './config';

let socket: Socket | null = null;

export function getSocket(token?: string): Socket {
  if (socket) return socket;

  socket = io(`${config.socketUrl}/chat`, {
    path: '/socket.io',
    auth: token ? { token } : undefined,
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 20000,
    autoConnect: true,
  });

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function getExistingSocket(): Socket | null {
  return socket;
}
