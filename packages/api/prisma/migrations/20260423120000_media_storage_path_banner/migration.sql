-- AlterTable
ALTER TABLE "employer_profiles" ADD COLUMN IF NOT EXISTS "banner_url" TEXT;

-- AlterTable
ALTER TABLE "media_assets" ADD COLUMN IF NOT EXISTS "storage_path" TEXT NOT NULL DEFAULT '';
ALTER TABLE "media_assets" ADD COLUMN IF NOT EXISTS "moderation_note" TEXT;

UPDATE "media_assets" SET "storage_path" = '' WHERE "storage_path" IS NULL;
