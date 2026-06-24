-- Скрытие анкеты работодателя админом (по умолчанию видима).
ALTER TABLE "employer_profiles" ADD COLUMN "is_hidden" BOOLEAN NOT NULL DEFAULT false;
