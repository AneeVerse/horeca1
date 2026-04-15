-- Multi-category mapping for Product.
-- Product.category_id stays as the denormalized primary FK.
-- product_categories stores the full many-to-many relation; exactly one
-- row per product should have is_primary = true and must mirror category_id.

-- CreateTable
CREATE TABLE "product_categories" (
    "product_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("product_id", "category_id")
);

-- CreateIndex
CREATE INDEX "product_categories_category_id_idx" ON "product_categories"("category_id");

-- CreateIndex
CREATE INDEX "product_categories_product_id_is_primary_idx" ON "product_categories"("product_id", "is_primary");

-- AddForeignKey
ALTER TABLE "product_categories"
    ADD CONSTRAINT "product_categories_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories"
    ADD CONSTRAINT "product_categories_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "categories"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill from existing Product.category_id
INSERT INTO "product_categories" ("product_id", "category_id", "is_primary")
SELECT "id", "category_id", true
FROM "products"
WHERE "category_id" IS NOT NULL
ON CONFLICT ("product_id", "category_id") DO NOTHING;
