-- CreateEnum
CREATE TYPE "ComplaintType" AS ENUM ('USER', 'MESSAGE', 'VACANCY', 'ORDER', 'CANCELLATION', 'NON_PAYMENT', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'NEEDS_CLARIFICATION');

-- CreateEnum
CREATE TYPE "ComplaintTargetType" AS ENUM ('USER', 'MESSAGE', 'VACANCY', 'ORDER');

-- CreateEnum
CREATE TYPE "InAppNotificationType" AS ENUM ('INVITATION', 'APPLICATION_RECEIVED', 'APPLICATION_RESPONSE', 'CANCELLATION', 'REVIEW_RECEIVED', 'COMPLAINT_UPDATE', 'SHIFT_REMINDER', 'SHIFT_COMPLETED', 'PAYMENT_RECEIVED', 'PAYMENT_REQUIRED', 'INDIVIDUAL_REQUEST', 'SYSTEM');

-- CreateEnum
CREATE TYPE "EmailLogStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'BOUNCED');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'FAILED', 'CANCELLED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "ShiftFailedBy" AS ENUM ('WORKER', 'EMPLOYER', 'BOTH');

-- CreateEnum
CREATE TYPE "ShiftPayStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "UserReviewPlan" AS ENUM ('FREE', 'BASIC', 'PRO');

-- CreateEnum
CREATE TYPE "ReliabilityLevel" AS ENUM ('NEW', 'BEGINNER', 'TRUSTED', 'VERIFIED', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "IndividualRequestStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('AVATAR', 'PORTFOLIO_PHOTO', 'VIDEO_CARD', 'DOCUMENT', 'COMPANY_LOGO', 'COMPANY_BANNER', 'COMPANY_GALLERY');

-- AlterTable
ALTER TABLE "worker_profiles" ADD COLUMN     "ready_for_overtime" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ready_for_trips" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "complaints" (
    "id" TEXT NOT NULL,
    "type" "ComplaintType" NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'NEW',
    "author_id" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "target_type" "ComplaintTargetType" NOT NULL,
    "description" TEXT NOT NULL,
    "admin_notes" TEXT,
    "resolved_by" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_history" (
    "id" TEXT NOT NULL,
    "complaint_id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "comment" TEXT,
    "old_status" "ComplaintStatus",
    "new_status" "ComplaintStatus",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaint_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "in_app_notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "InAppNotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "in_app_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email_invitation" BOOLEAN NOT NULL DEFAULT true,
    "email_cancellation" BOOLEAN NOT NULL DEFAULT true,
    "email_review" BOOLEAN NOT NULL DEFAULT true,
    "email_complaint" BOOLEAN NOT NULL DEFAULT true,
    "email_new_application" BOOLEAN NOT NULL DEFAULT true,
    "email_application_reply" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "to" TEXT NOT NULL,
    "type" "InAppNotificationType" NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "EmailLogStatus" NOT NULL DEFAULT 'PENDING',
    "provider_message_id" TEXT,
    "error" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "employer_id" TEXT NOT NULL,
    "status" "ShiftStatus" NOT NULL DEFAULT 'PENDING',
    "worker_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "employer_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "worker_confirmed_at" TIMESTAMP(3),
    "employer_confirmed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "failed_by" "ShiftFailedBy",
    "cancellation_reason" TEXT,
    "cancelled_by" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "admin_notified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_reviews" (
    "id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "reviewee_id" TEXT NOT NULL,
    "punctuality" INTEGER NOT NULL,
    "job_match" INTEGER NOT NULL,
    "communication" INTEGER NOT NULL,
    "work_quality" INTEGER NOT NULL,
    "terms_compliance" INTEGER NOT NULL,
    "overall_score" DOUBLE PRECISION NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_reliability_scores" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "total_shifts" INTEGER NOT NULL DEFAULT 0,
    "successful_shifts" INTEGER NOT NULL DEFAULT 0,
    "failed_shifts" INTEGER NOT NULL DEFAULT 0,
    "cancelled_shifts" INTEGER NOT NULL DEFAULT 0,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "level" "ReliabilityLevel" NOT NULL DEFAULT 'NEW',
    "strike_count" INTEGER NOT NULL DEFAULT 0,
    "is_restricted" BOOLEAN NOT NULL DEFAULT false,
    "restricted_at" TIMESTAMP(3),
    "restricted_reason" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_reliability_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cancellation_reasons" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "cancellation_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "individual_requests" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "event_type" TEXT,
    "staff_needed" TEXT,
    "position" TEXT,
    "experience" TEXT,
    "message" TEXT NOT NULL,
    "status" "IndividualRequestStatus" NOT NULL DEFAULT 'NEW',
    "admin_comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "individual_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "is_rejected" BOOLEAN NOT NULL DEFAULT false,
    "moderated_by" TEXT,
    "moderated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_review_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan" "UserReviewPlan" NOT NULL DEFAULT 'FREE',
    "reviews_limit" INTEGER NOT NULL DEFAULT 3,
    "reviews_used" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_review_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_payments" (
    "id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "payer_id" TEXT NOT NULL,
    "payee_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "status" "ShiftPayStatus" NOT NULL DEFAULT 'PENDING',
    "provider_payment_id" TEXT,
    "provider_data" JSONB,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "details" JSONB,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "complaints_status_created_at_idx" ON "complaints"("status", "created_at");

-- CreateIndex
CREATE INDEX "complaints_author_id_idx" ON "complaints"("author_id");

-- CreateIndex
CREATE INDEX "complaints_target_id_target_type_idx" ON "complaints"("target_id", "target_type");

-- CreateIndex
CREATE INDEX "complaint_history_complaint_id_created_at_idx" ON "complaint_history"("complaint_id", "created_at");

-- CreateIndex
CREATE INDEX "in_app_notifications_user_id_is_read_created_at_idx" ON "in_app_notifications"("user_id", "is_read", "created_at");

-- CreateIndex
CREATE INDEX "in_app_notifications_type_idx" ON "in_app_notifications"("type");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_key" ON "notification_preferences"("user_id");

-- CreateIndex
CREATE INDEX "email_logs_user_id_created_at_idx" ON "email_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "email_logs_status_created_at_idx" ON "email_logs"("status", "created_at");

-- CreateIndex
CREATE INDEX "shifts_booking_id_idx" ON "shifts"("booking_id");

-- CreateIndex
CREATE INDEX "shifts_status_created_at_idx" ON "shifts"("status", "created_at");

-- CreateIndex
CREATE INDEX "shifts_worker_id_status_idx" ON "shifts"("worker_id", "status");

-- CreateIndex
CREATE INDEX "shifts_employer_id_status_idx" ON "shifts"("employer_id", "status");

-- CreateIndex
CREATE INDEX "shifts_created_at_idx" ON "shifts"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "shifts_booking_id_worker_id_key" ON "shifts"("booking_id", "worker_id");

-- CreateIndex
CREATE INDEX "shift_reviews_shift_id_idx" ON "shift_reviews"("shift_id");

-- CreateIndex
CREATE INDEX "shift_reviews_reviewer_id_idx" ON "shift_reviews"("reviewer_id");

-- CreateIndex
CREATE INDEX "shift_reviews_reviewee_id_created_at_idx" ON "shift_reviews"("reviewee_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_reliability_scores_user_id_key" ON "user_reliability_scores"("user_id");

-- CreateIndex
CREATE INDEX "user_reliability_scores_level_idx" ON "user_reliability_scores"("level");

-- CreateIndex
CREATE INDEX "user_reliability_scores_score_idx" ON "user_reliability_scores"("score");

-- CreateIndex
CREATE UNIQUE INDEX "cancellation_reasons_code_key" ON "cancellation_reasons"("code");

-- CreateIndex
CREATE INDEX "cancellation_reasons_role_is_active_sort_order_idx" ON "cancellation_reasons"("role", "is_active", "sort_order");

-- CreateIndex
CREATE INDEX "individual_requests_status_created_at_idx" ON "individual_requests"("status", "created_at");

-- CreateIndex
CREATE INDEX "individual_requests_role_status_idx" ON "individual_requests"("role", "status");

-- CreateIndex
CREATE INDEX "media_assets_user_id_type_created_at_idx" ON "media_assets"("user_id", "type", "created_at");

-- CreateIndex
CREATE INDEX "media_assets_is_approved_created_at_idx" ON "media_assets"("is_approved", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_review_subscriptions_user_id_key" ON "user_review_subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "shift_payments_shift_id_idx" ON "shift_payments"("shift_id");

-- CreateIndex
CREATE INDEX "shift_payments_payer_id_status_idx" ON "shift_payments"("payer_id", "status");

-- CreateIndex
CREATE INDEX "shift_payments_payee_id_status_idx" ON "shift_payments"("payee_id", "status");

-- CreateIndex
CREATE INDEX "shift_payments_status_created_at_idx" ON "shift_payments"("status", "created_at");

-- CreateIndex
CREATE INDEX "admin_audit_logs_admin_id_created_at_idx" ON "admin_audit_logs"("admin_id", "created_at");

-- CreateIndex
CREATE INDEX "admin_audit_logs_entity_type_entity_id_idx" ON "admin_audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "admin_audit_logs_action_created_at_idx" ON "admin_audit_logs"("action", "created_at");

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_history" ADD CONSTRAINT "complaint_history_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_history" ADD CONSTRAINT "complaint_history_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "in_app_notifications" ADD CONSTRAINT "in_app_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_employer_id_fkey" FOREIGN KEY ("employer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_reviews" ADD CONSTRAINT "shift_reviews_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_reviews" ADD CONSTRAINT "shift_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_reviews" ADD CONSTRAINT "shift_reviews_reviewee_id_fkey" FOREIGN KEY ("reviewee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_reliability_scores" ADD CONSTRAINT "user_reliability_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_review_subscriptions" ADD CONSTRAINT "user_review_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_payments" ADD CONSTRAINT "shift_payments_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_payments" ADD CONSTRAINT "shift_payments_payer_id_fkey" FOREIGN KEY ("payer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_payments" ADD CONSTRAINT "shift_payments_payee_id_fkey" FOREIGN KEY ("payee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
