-- One active payment per shift: replace non-unique index with unique constraint
DROP INDEX IF EXISTS "shift_payments_shift_id_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "shift_payments_shift_id_key" ON "shift_payments"("shift_id");

ALTER TABLE "individual_requests" ADD COLUMN IF NOT EXISTS "event_date" DATE;
ALTER TABLE "individual_requests" ADD COLUMN IF NOT EXISTS "quantity" INTEGER;
ALTER TABLE "individual_requests" ADD COLUMN IF NOT EXISTS "availability" TEXT;

CREATE TABLE IF NOT EXISTS "review_profile_views" (
    "id" TEXT NOT NULL,
    "viewer_id" TEXT NOT NULL,
    "target_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_profile_views_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "review_profile_views_viewer_id_target_user_id_key" ON "review_profile_views"("viewer_id", "target_user_id");
CREATE INDEX IF NOT EXISTS "review_profile_views_viewer_id_created_at_idx" ON "review_profile_views"("viewer_id", "created_at");

DO $$ BEGIN
 ALTER TABLE "review_profile_views" ADD CONSTRAINT "review_profile_views_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "review_profile_views" ADD CONSTRAINT "review_profile_views_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
