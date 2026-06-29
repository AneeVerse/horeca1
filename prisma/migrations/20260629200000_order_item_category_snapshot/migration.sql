-- OrderItem category snapshot: capture the product's category name at checkout so
-- invoices group historical orders by the category as it was at order time, not the
-- live (possibly re-categorised) product.

ALTER TABLE "order_items" ADD COLUMN "category_name" VARCHAR(255);

-- Backfill existing rows from the linked product's current category. Best-effort:
-- pre-migration orders predate the snapshot, so this reflects the CURRENT category,
-- not necessarily the one in force when the order was placed. Documented limitation.
UPDATE "order_items" AS oi
SET "category_name" = c."name"
FROM "products" AS p
JOIN "categories" AS c ON c."id" = p."category_id"
WHERE oi."product_id" = p."id"
  AND oi."category_name" IS NULL;
