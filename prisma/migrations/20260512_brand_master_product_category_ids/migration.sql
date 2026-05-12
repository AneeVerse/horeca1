-- Add category_ids UUID[] to brand_master_products so a brand canonical product
-- can belong to multiple categories. The existing category_id column stays as the
-- "primary" category for legacy single-category display paths (brand store etc.);
-- category_ids is the source of truth going forward.
ALTER TABLE "brand_master_products"
  ADD COLUMN IF NOT EXISTS "category_ids" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[];

-- Backfill: copy the existing primary category_id into the array.
UPDATE "brand_master_products"
  SET "category_ids" = ARRAY["category_id"]::UUID[]
  WHERE "category_id" IS NOT NULL
    AND "category_ids" = ARRAY[]::UUID[];
