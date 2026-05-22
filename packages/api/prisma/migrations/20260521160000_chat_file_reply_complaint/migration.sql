-- Add FILE to MessageType enum
ALTER TYPE "MessageType" ADD VALUE 'FILE';

-- Add CHAT_FILE to MediaType enum
ALTER TYPE "MediaType" ADD VALUE 'CHAT_FILE';

-- Add file attachment and reply columns to chat_messages
ALTER TABLE "chat_messages"
  ADD COLUMN "file_url" TEXT,
  ADD COLUMN "file_name" VARCHAR(255),
  ADD COLUMN "reply_to_id" TEXT,
  ADD COLUMN "reply_to_text" TEXT,
  ADD COLUMN "reply_to_sender_name" VARCHAR(100);
