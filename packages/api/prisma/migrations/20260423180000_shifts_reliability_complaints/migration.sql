-- Shift completion / escalation / failure metadata
ALTER TABLE "shifts" ADD COLUMN "completed_at" TIMESTAMP(3);
ALTER TABLE "shifts" ADD COLUMN "stale_confirm_notified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "shifts" ADD COLUMN "failure_code" TEXT;
ALTER TABLE "shifts" ADD COLUMN "failure_note" TEXT;
ALTER TABLE "shifts" ADD COLUMN "cancellation_code" TEXT;

-- Complaint sanction flag
ALTER TABLE "complaints" ADD COLUMN "sanction_applied" BOOLEAN NOT NULL DEFAULT false;

-- Deduplicate shift_reviews (keep row with smallest id per shift+reviewer)
DELETE FROM "shift_reviews" WHERE "id" IN (
  SELECT sr1."id" FROM "shift_reviews" sr1
  WHERE EXISTS (
    SELECT 1 FROM "shift_reviews" sr2
    WHERE sr2."shift_id" = sr1."shift_id"
      AND sr2."reviewer_id" = sr1."reviewer_id"
      AND sr2."id" < sr1."id"
  )
);

CREATE UNIQUE INDEX "shift_reviews_shift_id_reviewer_id_key" ON "shift_reviews"("shift_id", "reviewer_id");
