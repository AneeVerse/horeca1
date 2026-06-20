-- DropIndex
DROP INDEX "products_brand_trgm";

-- DropIndex
DROP INDEX "products_name_trgm";

-- AlterTable
ALTER TABLE "brand_master_products" ADD COLUMN     "master_product_id" UUID;

-- AlterTable
ALTER TABLE "master_products" ADD COLUMN     "approval_note" TEXT,
ADD COLUMN     "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'approved',
ADD COLUMN     "approved_at" TIMESTAMPTZ,
ADD COLUMN     "approved_by" UUID,
ADD COLUMN     "suggested_by" UUID;

-- CreateIndex
CREATE INDEX "brand_master_products_master_product_id_idx" ON "brand_master_products"("master_product_id");

-- CreateIndex
CREATE INDEX "master_products_approval_status_idx" ON "master_products"("approval_status");

-- AddForeignKey
ALTER TABLE "brand_master_products" ADD CONSTRAINT "brand_master_products_master_product_id_fkey" FOREIGN KEY ("master_product_id") REFERENCES "master_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
