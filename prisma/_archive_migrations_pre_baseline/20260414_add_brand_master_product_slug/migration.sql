-- Add missing slug and category columns to brand_master_products
-- These were added to schema.prisma but a migration was never generated

ALTER TABLE "brand_master_products" ADD COLUMN IF NOT EXISTS "slug" VARCHAR(255);
ALTER TABLE "brand_master_products" ADD COLUMN IF NOT EXISTS "category" VARCHAR(100);

-- Backfill slug from name for any existing rows
UPDATE "brand_master_products"
SET "slug" = lower(regexp_replace("name", '[^a-z0-9]+', '-', 'gi'))
WHERE "slug" IS NULL;

-- Now enforce NOT NULL (all existing rows have a value)
ALTER TABLE "brand_master_products" ALTER COLUMN "slug" SET NOT NULL;

-- Add unique constraint (brandId, slug)
CREATE UNIQUE INDEX IF NOT EXISTS "brand_master_products_brand_id_slug_key"
ON "brand_master_products"("brand_id", "slug");
