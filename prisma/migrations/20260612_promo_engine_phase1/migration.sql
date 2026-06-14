-- CreateEnum
CREATE TYPE "promo_discount_type" AS ENUM ('flat', 'percentage');

-- CreateEnum
CREATE TYPE "coupon_redemption_status" AS ENUM ('active', 'reversed');

-- CreateEnum
CREATE TYPE "cashback_destination" AS ENUM ('wallet', 'upi');

-- CreateEnum
CREATE TYPE "cashback_entry_status" AS ENUM ('pending', 'approved', 'credited', 'paid', 'cancelled');

-- CreateEnum
CREATE TYPE "cashback_entry_source" AS ENUM ('order', 'direct_grant');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "coupon_code" VARCHAR(40),
ADD COLUMN     "coupon_discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "coupon_id" UUID,
ADD COLUMN     "wallet_applied" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "coupons" (
    "id" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "vendor_id" UUID,
    "discount_type" "promo_discount_type" NOT NULL,
    "discount_value" DECIMAL(10,2) NOT NULL,
    "max_discount" DECIMAL(10,2),
    "min_order_value" DECIMAL(12,2),
    "start_date" TIMESTAMPTZ,
    "end_date" TIMESTAMPTZ,
    "usage_limit" INTEGER,
    "per_user_limit" INTEGER,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "category_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "product_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "brand_names" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "stacks_with_vendor_promo" BOOLEAN NOT NULL DEFAULT true,
    "stacks_with_cashback" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_redemptions" (
    "id" UUID NOT NULL,
    "coupon_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "checkout_group_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "coupon_redemption_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cashback_campaigns" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "vendor_id" UUID,
    "cashback_type" "promo_discount_type" NOT NULL,
    "cashback_value" DECIMAL(10,2) NOT NULL,
    "max_cashback" DECIMAL(10,2),
    "min_order_value" DECIMAL(12,2),
    "destination" "cashback_destination" NOT NULL DEFAULT 'wallet',
    "start_date" TIMESTAMPTZ,
    "end_date" TIMESTAMPTZ,
    "per_user_limit" INTEGER,
    "total_budget" DECIMAL(12,2),
    "used_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "stacks_with_coupon" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cashback_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cashback_entries" (
    "id" UUID NOT NULL,
    "campaign_id" UUID,
    "user_id" UUID NOT NULL,
    "order_id" UUID,
    "vendor_id" UUID,
    "source" "cashback_entry_source" NOT NULL DEFAULT 'order',
    "amount" DECIMAL(10,2) NOT NULL,
    "destination" "cashback_destination" NOT NULL,
    "upi_id" VARCHAR(100),
    "status" "cashback_entry_status" NOT NULL DEFAULT 'pending',
    "cashback_type" "promo_discount_type",
    "cashback_value" DECIMAL(10,2),
    "max_cashback" DECIMAL(10,2),
    "min_order_value" DECIMAL(12,2),
    "wallet_txn_id" UUID,
    "paid_reference" VARCHAR(100),
    "notes" TEXT,
    "created_by_id" UUID,
    "credited_at" TIMESTAMPTZ,
    "paid_at" TIMESTAMPTZ,
    "cancelled_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cashback_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupons_vendor_id_is_active_idx" ON "coupons"("vendor_id", "is_active");

-- CreateIndex
CREATE INDEX "coupons_is_active_end_date_idx" ON "coupons"("is_active", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_redemptions_order_id_key" ON "coupon_redemptions"("order_id");

-- CreateIndex
CREATE INDEX "coupon_redemptions_coupon_id_user_id_status_idx" ON "coupon_redemptions"("coupon_id", "user_id", "status");

-- CreateIndex
CREATE INDEX "coupon_redemptions_checkout_group_id_idx" ON "coupon_redemptions"("checkout_group_id");

-- CreateIndex
CREATE INDEX "cashback_campaigns_vendor_id_is_active_idx" ON "cashback_campaigns"("vendor_id", "is_active");

-- CreateIndex
CREATE INDEX "cashback_campaigns_is_active_end_date_idx" ON "cashback_campaigns"("is_active", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "cashback_entries_order_id_key" ON "cashback_entries"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "cashback_entries_wallet_txn_id_key" ON "cashback_entries"("wallet_txn_id");

-- CreateIndex
CREATE INDEX "cashback_entries_user_id_status_idx" ON "cashback_entries"("user_id", "status");

-- CreateIndex
CREATE INDEX "cashback_entries_campaign_id_idx" ON "cashback_entries"("campaign_id");

-- CreateIndex
CREATE INDEX "cashback_entries_status_destination_idx" ON "cashback_entries"("status", "destination");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashback_campaigns" ADD CONSTRAINT "cashback_campaigns_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashback_entries" ADD CONSTRAINT "cashback_entries_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "cashback_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashback_entries" ADD CONSTRAINT "cashback_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashback_entries" ADD CONSTRAINT "cashback_entries_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

