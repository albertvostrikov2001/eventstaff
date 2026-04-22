-- AlterTable
ALTER TABLE "email_logs" ADD COLUMN IF NOT EXISTS "template_data" JSONB;
