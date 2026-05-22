import type { ChatMessage } from '@prisma/client';

export type ChatMessageApi = {
  id: string;
  roomId: string;
  senderId: string;
  type: string;
  text: string | null;
  fileUrl: string | null;
  fileName: string | null;
  replyToId: string | null;
  replyToText: string | null;
  replyToSenderName: string | null;
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
    fileUrl: m.fileUrl ?? null,
    fileName: m.fileName ?? null,
    replyToId: m.replyToId ?? null,
    replyToText: m.replyToText ?? null,
    replyToSenderName: m.replyToSenderName ?? null,
    isRead: m.isRead,
    readAt: m.readAt?.toISOString() ?? null,
    isSystem: m.isSystem,
    createdAt: m.createdAt.toISOString(),
  };
}
