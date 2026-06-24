-- Скрытие вакансии админом из публичного каталога (по умолчанию видима).
ALTER TABLE "vacancies" ADD COLUMN "is_hidden" BOOLEAN NOT NULL DEFAULT false;
