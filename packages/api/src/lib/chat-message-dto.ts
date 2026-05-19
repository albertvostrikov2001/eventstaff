import type { ChatMessage } from '@prisma/client';

export type ChatMessageApi = {
  id: string;
  roomId: string;
  senderId: string;
  type: string;
  text: string | null;
  isRead: boolean;
  readAt: string | null;
  isSystem: boolean;
  createdAt: string;
};

export function serializeChatMessage(m: ChatMessage): ChatMessageApi {
  return {
    id: m.id,
    roomId: m.roomId,
    senderId: m.senderId,
    type: m.type,
    text: m.text,
    isRead: m.isRead,
    readAt: m.readAt?.toISOString() ?? null,
    isSystem: m.isSystem,
    createdAt: m.createdAt.toISOString(),
  };
}
