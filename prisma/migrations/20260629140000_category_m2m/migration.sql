-- CategoryCategory + MasterProductCategory M2M tables; backfill from parentId / categoryId.

CREATE TABLE "category_categories" (
    "category_id" UUID NOT NULL,
    "sub_category_id" UUID NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "category_categories_pkey" PRIMARY KEY ("category_id","sub_category_id")
);

CREATE INDEX "category_categories_sub_category_id_idx" ON "category_categories"("sub_category_id");

ALTER TABLE "category_categories" ADD CONSTRAINT "category_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "category_categories" ADD CONSTRAINT "category_categories_sub_category_id_fkey" FOREIGN KEY ("sub_category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill parentId rows into CategoryCategory (primary parent link).
INSERT INTO "category_categories" ("category_id", "sub_category_id", "is_primary")
SELECT "parent_id", "id", true
FROM "categories"
WHERE "parent_id" IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE TABLE "master_product_categories" (
    "master_product_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "master_product_categories_pkey" PRIMARY KEY ("master_product_id","category_id")
);

CREATE INDEX "master_product_categories_category_id_idx" ON "master_product_categories"("category_id");
CREATE INDEX "master_product_categories_master_product_id_is_primary_idx" ON "master_product_categories"("master_product_id", "is_primary");

ALTER TABLE "master_product_categories" ADD CONSTRAINT "master_product_categories_master_product_id_fkey" FOREIGN KEY ("master_product_id") REFERENCES "master_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "master_product_categories" ADD CONSTRAINT "master_product_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill from MasterProduct.categoryId (primary sub-category).
INSERT INTO "master_product_categories" ("master_product_id", "category_id", "is_primary")
SELECT "id", "category_id", true
FROM "master_products"
ON CONFLICT DO NOTHING;
