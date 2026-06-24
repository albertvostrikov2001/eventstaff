-- Split "accept assignment" from "confirm completion" on shifts.
-- Adds acceptance fields; existing shifts that already progressed past PENDING
-- are backfilled as accepted to keep them consistent with the new flow.

ALTER TABLE "shifts" ADD COLUMN "worker_accepted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "shifts" ADD COLUMN "employer_accepted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "shifts" ADD COLUMN "worker_accepted_at" TIMESTAMP(3);
ALTER TABLE "shifts" ADD COLUMN "employer_accepted_at" TIMESTAMP(3);

-- Backfill: any shift that is no longer PENDING was already accepted under the old flow.
UPDATE "shifts"
SET "worker_accepted" = true,
    "employer_accepted" = true
WHERE "status" IN ('ACTIVE', 'COMPLETED', 'DISPUTED', 'FAILED');
