-- OrderItem line snapshots: capture catalog identity fields at checkout time so
-- invoices and historical orders stay immutable when the vendor edits the product.

ALTER TABLE "order_items"
  ADD COLUMN "product_sku" VARCHAR(100),
  ADD COLUMN "hsn" VARCHAR(50),
  ADD COLUMN "brand" VARCHAR(150),
  ADD COLUMN "pack_size" VARCHAR(100),
  ADD COLUMN "tax_percent" DECIMAL(5, 2);

-- Backfill existing rows from the linked product (best-effort for pre-migration orders).
UPDATE "order_items" AS oi
SET
  "product_sku" = p."sku",
  "hsn" = p."hsn",
  "brand" = p."brand",
  "pack_size" = p."pack_size",
  "tax_percent" = p."tax_percent"
FROM "products" AS p
WHERE oi."product_id" = p."id"
  AND oi."product_sku" IS NULL;
