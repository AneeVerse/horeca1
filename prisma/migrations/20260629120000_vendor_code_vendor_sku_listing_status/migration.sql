-- Vendor code (SKU prefix), product vendor POS SKU, and draft/published listing status.

CREATE TYPE "ListingStatus" AS ENUM ('draft', 'published');

ALTER TABLE "vendors" ADD COLUMN "vendor_code" VARCHAR(20);

ALTER TABLE "products" ADD COLUMN "vendor_sku" VARCHAR(100);
ALTER TABLE "products" ADD COLUMN "listing_status" "ListingStatus" NOT NULL DEFAULT 'published';

CREATE UNIQUE INDEX "vendors_vendor_code_key" ON "vendors"("vendor_code");

CREATE INDEX "products_listing_status_idx" ON "products"("listing_status");

-- Backfill vendor_code from slug prefix (first segment, uppercased). Append row
-- number when multiple vendors would share the same code.
WITH derived AS (
  SELECT
    id,
    UPPER(
      LEFT(
        COALESCE(NULLIF(SPLIT_PART(slug, '-', 1), ''), slug),
        20
      )
    ) AS base_code,
    created_at
  FROM vendors
  WHERE vendor_code IS NULL
),
numbered AS (
  SELECT
    id,
    base_code,
    ROW_NUMBER() OVER (PARTITION BY base_code ORDER BY created_at, id) AS rn
  FROM derived
)
UPDATE vendors v
SET vendor_code = CASE
  WHEN n.rn = 1 THEN n.base_code
  ELSE LEFT(n.base_code, GREATEST(1, 20 - LENGTH(n.rn::text))) || n.rn::text
END
FROM numbered n
WHERE v.id = n.id;

-- Backfill vendor_sku from composed sku (strip vendor_code prefix when present).
UPDATE products p
SET vendor_sku = CASE
  WHEN p.sku IS NULL OR TRIM(p.sku) = '' THEN NULL
  WHEN v.vendor_code IS NOT NULL AND UPPER(p.sku) LIKE UPPER(v.vendor_code) || '-%'
    THEN SUBSTRING(p.sku FROM LENGTH(v.vendor_code) + 2)
  WHEN POSITION('-' IN p.sku) > 0
    THEN SUBSTRING(p.sku FROM POSITION('-' IN p.sku) + 1)
  ELSE p.sku
END
FROM vendors v
WHERE p.vendor_id = v.id
  AND p.vendor_sku IS NULL
  AND p.sku IS NOT NULL
  AND TRIM(p.sku) <> '';
