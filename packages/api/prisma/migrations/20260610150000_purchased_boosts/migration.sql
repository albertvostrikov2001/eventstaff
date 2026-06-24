-- Инвентарь купленных бустов: начисляются при оплате, активируются вручную из кабинета.
CREATE TABLE "purchased_boosts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "payment_id" TEXT,
    "vacancy_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activated_at" TIMESTAMP(3),
    CONSTRAINT "purchased_boosts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "purchased_boosts_user_id_status_idx" ON "purchased_boosts"("user_id", "status");
