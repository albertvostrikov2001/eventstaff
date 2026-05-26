-- Add NEW_CHAT_MESSAGE to InAppNotificationType enum
ALTER TYPE "InAppNotificationType" ADD VALUE IF NOT EXISTS 'NEW_CHAT_MESSAGE';

-- Add emailChatMessage preference to notification_preferences
ALTER TABLE "notification_preferences"
  ADD COLUMN IF NOT EXISTS "email_chat_message" BOOLEAN NOT NULL DEFAULT true;
