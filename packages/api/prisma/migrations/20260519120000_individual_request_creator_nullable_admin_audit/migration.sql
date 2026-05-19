-- AlterTable: allow system-submitted individual requests to reference a user (employer)
ALTER TABLE "individual_requests" ADD COLUMN "created_by_user_id" TEXT;

-- AlterTable: audit entries may have no admin actor (public form / API creates)
ALTER TABLE "admin_audit_logs" ALTER COLUMN "admin_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "individual_requests" ADD CONSTRAINT "individual_requests_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "individual_requests_created_by_user_id_created_at_idx" ON "individual_requests"("created_by_user_id", "created_at");
