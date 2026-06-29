-- Catalog plan addendum: pending_edit, submitted listing status, audit log, indexes

-- ApprovalStatus: add pending_edit
ALTER TYPE "ApprovalStatus" ADD VALUE IF NOT EXISTS 'pending_edit';

-- ListingStatus: rename published → submitted
ALTER TYPE "ListingStatus" RENAME VALUE 'published' TO 'submitted';

-- Product: pending edit payload + archive timestamp
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "pending_edit_payload" JSONB;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMPTZ;

-- Product audit log (field-level history)
CREATE TABLE IF NOT EXISTS "product_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "field" VARCHAR(64) NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "changed_by" UUID NOT NULL,
    "changed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" VARCHAR(32) NOT NULL,

    CONSTRAINT "product_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "product_audit_logs_product_id_changed_at_idx"
    ON "product_audit_logs"("product_id", "changed_at" DESC);

ALTER TABLE "product_audit_logs"
    ADD CONSTRAINT "product_audit_logs_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_audit_logs"
    ADD CONSTRAINT "product_audit_logs_changed_by_fkey"
    FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Master product revision history (7-day rollback support)
CREATE TABLE IF NOT EXISTS "master_product_revisions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "master_product_id" UUID NOT NULL,
    "snapshot" JSONB NOT NULL,
    "category_ids" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "master_product_revisions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "master_product_revisions_master_product_id_created_at_idx"
    ON "master_product_revisions"("master_product_id", "created_at" DESC);

ALTER TABLE "master_product_revisions"
    ADD CONSTRAINT "master_product_revisions_master_product_id_fkey"
    FOREIGN KEY ("master_product_id") REFERENCES "master_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "master_product_revisions"
    ADD CONSTRAINT "master_product_revisions_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Product.vendorSku lookup
CREATE INDEX IF NOT EXISTS "products_vendor_id_vendor_sku_idx"
    ON "products"("vendor_id", "vendor_sku");

CREATE UNIQUE INDEX IF NOT EXISTS "products_vendor_id_vendor_sku_unique"
    ON "products"("vendor_id", "vendor_sku")
    WHERE "vendor_sku" IS NOT NULL
      AND "slug" NOT LIKE '_deleted_%';

-- Exactly one primary category per product / master product
CREATE UNIQUE INDEX IF NOT EXISTS "product_categories_one_primary"
    ON "product_categories"("product_id")
    WHERE "is_primary" = true;

CREATE UNIQUE INDEX IF NOT EXISTS "master_product_categories_one_primary"
    ON "master_product_categories"("master_product_id")
    WHERE "is_primary" = true;
