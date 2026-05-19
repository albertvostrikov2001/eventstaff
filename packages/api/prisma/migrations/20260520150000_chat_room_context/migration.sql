-- CreateEnum
CREATE TYPE "ChatRoomContextType" AS ENUM ('APPLICATION', 'INVITATION', 'SHIFT', 'VACANCY', 'GENERAL');

-- AlterTable
ALTER TABLE "chat_rooms" ADD COLUMN "context_type" "ChatRoomContextType" NOT NULL DEFAULT 'GENERAL';
ALTER TABLE "chat_rooms" ADD COLUMN "context_id" TEXT;
ALTER TABLE "chat_rooms" ADD COLUMN "last_message_at" TIMESTAMP(3);

-- Backfill last_message_at from latest chat message per room
UPDATE "chat_rooms" AS cr
SET "last_message_at" = COALESCE(
  (
    SELECT MAX(cm."created_at")
    FROM "chat_messages" AS cm
    WHERE cm."room_id" = cr."id"
  ),
  cr."created_at"
);

ALTER TABLE "chat_rooms" ALTER COLUMN "last_message_at" SET NOT NULL;

-- CreateIndex
CREATE INDEX "chat_rooms_last_message_at_idx" ON "chat_rooms"("last_message_at");
