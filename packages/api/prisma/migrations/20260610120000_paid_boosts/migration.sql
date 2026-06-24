-- Paid boosts: timed effects for worker/vacancy and employer boost-credit balance.
-- All columns are additive and nullable / defaulted, safe to apply on populated tables.

-- Worker: temporary unlimited applications + temporary "recommended" badge
ALTER TABLE "worker_profiles" ADD COLUMN "unlimited_until" TIMESTAMP(3);
ALTER TABLE "worker_profiles" ADD COLUMN "recommended_until" TIMESTAMP(3);

-- Vacancy: temporary colored highlight in catalog
ALTER TABLE "vacancies" ADD COLUMN "highlight_until" TIMESTAMP(3);

-- Employer: balance of purchasable top-boosts (package "5 boosts")
ALTER TABLE "employer_profiles" ADD COLUMN "boost_credits" INTEGER NOT NULL DEFAULT 0;
