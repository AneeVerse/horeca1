-- Central "Horeca1 SKU" master catalog (P0-1).
-- Step 1 of 2: create master_products + add a NULLABLE products.master_product_id.
-- The backfill script (prisma/scripts/backfill-master-products.ts) links every
-- existing product, then flips the column to NOT NULL once it verifies 0 nulls.
-- This step is additive only => safe to apply on a populated table.

-- CreateTable
CREATE TABLE "master_products" (
  "id"              UUID         NOT NULL,
  "sku"             VARCHAR(40)  NOT NULL,
  "name"            VARCHAR(255) NOT NULL,
  "alias_names"     TEXT[]       DEFAULT ARRAY[]::TEXT[],
  "brand"           VARCHAR(150),
  "uom"             VARCHAR(50),
  "tax_percent"     DECIMAL(5,2) NOT NULL DEFAULT 0,
  "image_url"       VARCHAR(512),
  "images"          TEXT[]       DEFAULT ARRAY[]::TEXT[],
  "search_keywords" TEXT[]       DEFAULT ARRAY[]::TEXT[],
  "category_id"     UUID         NOT NULL,
  "is_active"       BOOLEAN      NOT NULL DEFAULT true,
  "created_at"      TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "master_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "master_products_sku_key" ON "master_products"("sku");
CREATE INDEX "master_products_category_id_idx" ON "master_products"("category_id");
CREATE INDEX "master_products_sku_idx" ON "master_products"("sku");
CREATE INDEX "master_products_is_active_idx" ON "master_products"("is_active");

-- AlterTable
ALTER TABLE "products" ADD COLUMN "master_product_id" UUID;

-- CreateIndex
CREATE INDEX "products_master_product_id_idx" ON "products"("master_product_id");

-- AddForeignKey
ALTER TABLE "master_products"
  ADD CONSTRAINT "master_products_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "categories"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "products"
  ADD CONSTRAINT "products_master_product_id_fkey"
  FOREIGN KEY ("master_product_id") REFERENCES "master_products"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
