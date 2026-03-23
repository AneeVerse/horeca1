-- Add missing product fields for comprehensive product management
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "images" TEXT[] DEFAULT '{}';
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "sku" VARCHAR(100);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "hsn" VARCHAR(50);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "brand" VARCHAR(150);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "barcode" VARCHAR(100);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT '{}';
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "original_price" DECIMAL(10, 2);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "tax_percent" DECIMAL(5, 2) NOT NULL DEFAULT 0;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "min_order_qty" INTEGER NOT NULL DEFAULT 1;

-- Index for SKU lookups
CREATE INDEX IF NOT EXISTS "products_sku_idx" ON "products"("sku");
