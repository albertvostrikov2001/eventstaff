-- Статус "paused", обложка и теги для вакансий работодателя
DO $$
BEGIN
  ALTER TYPE "VacancyStatus" ADD VALUE 'paused';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

ALTER TABLE "vacancies" ADD COLUMN IF NOT EXISTS "cover_image_url" TEXT;
ALTER TABLE "vacancies" ADD COLUMN IF NOT EXISTS "tags" JSONB;
