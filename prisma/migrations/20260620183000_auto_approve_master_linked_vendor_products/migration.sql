-- Vendor listings linked to an approved master SKU should not sit in pending review.
-- Fixes rows created before createProduct auto-approved on master pick.
UPDATE "products" p
SET
  "approval_status" = 'approved',
  "approved_at" = COALESCE(p."approved_at", NOW())
WHERE p."approval_status" = 'pending'
  AND p."master_product_id" IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM "master_products" m
    WHERE m."id" = p."master_product_id"
      AND m."approval_status" = 'approved'
      AND m."is_active" = true
  );
