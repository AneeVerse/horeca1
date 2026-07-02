-- MasterProduct.packSize + brand authorized distributor gate

CREATE TYPE "BrandAuthorizedDistributorStatus" AS ENUM ('pending', 'approved', 'rejected');

ALTER TABLE "master_products" ADD COLUMN IF NOT EXISTS "pack_size" VARCHAR(100);

CREATE TABLE "brand_authorized_distributors" (
    "id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "status" "BrandAuthorizedDistributorStatus" NOT NULL DEFAULT 'pending',
    "brand_approved_at" TIMESTAMPTZ,
    "brand_approved_by" UUID,
    "admin_approved_at" TIMESTAMPTZ,
    "admin_approved_by" UUID,
    "rejected_at" TIMESTAMPTZ,
    "rejected_by" UUID,
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_authorized_distributors_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "brand_authorized_distributors_brand_id_vendor_id_key" ON "brand_authorized_distributors"("brand_id", "vendor_id");
CREATE INDEX "brand_authorized_distributors_brand_id_status_idx" ON "brand_authorized_distributors"("brand_id", "status");
CREATE INDEX "brand_authorized_distributors_vendor_id_idx" ON "brand_authorized_distributors"("vendor_id");

ALTER TABLE "brand_authorized_distributors" ADD CONSTRAINT "brand_authorized_distributors_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "brand_authorized_distributors" ADD CONSTRAINT "brand_authorized_distributors_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
