-- V2.2 Phase 4 — PriceList Management upgrade
-- Additive only. No DROP. No NOT NULL on existing rows. Safe to apply
-- to a populated database.

-- ── Enums ──────────────────────────────────────────────────────────────
CREATE TYPE "pricing_type" AS ENUM ('fixed', 'discount', 'special', 'scheme');

CREATE TYPE "price_list_assignment_type" AS ENUM (
    'customer', 'outlet', 'pincode', 'area', 'segment', 'brand'
);

-- ── Extend PriceListItem ───────────────────────────────────────────────
-- customPrice goes nullable so 'discount' rows (which use a percentage,
-- not a fixed price) can be stored. Existing data has non-null values,
-- so the constraint relaxation is safe.
ALTER TABLE "price_list_items"
    ALTER COLUMN "custom_price" DROP NOT NULL;

ALTER TABLE "price_list_items"
    ADD COLUMN "pricing_type"      "pricing_type" NOT NULL DEFAULT 'fixed',
    ADD COLUMN "discount_percent"  DECIMAL(5, 2),
    ADD COLUMN "scheme_min_qty"    INTEGER,
    ADD COLUMN "scheme_free_qty"   INTEGER;

-- ── PriceListAssignment ───────────────────────────────────────────────
CREATE TABLE "price_list_assignments" (
    "id"                  UUID NOT NULL DEFAULT gen_random_uuid(),
    "price_list_id"       UUID NOT NULL,
    "type"                "price_list_assignment_type" NOT NULL,
    "user_id"             UUID,
    "business_account_id" UUID,
    "outlet_id"           UUID,
    "brand_id"            UUID,
    "pincode"             VARCHAR(10),
    "area"                VARCHAR(100),
    "segment"             VARCHAR(100),
    "brand_name"          VARCHAR(150),
    "created_at"          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_list_assignments_pkey" PRIMARY KEY ("id"),

    -- Defence-in-depth: exactly one targeting column should be populated
    -- per row, matching the row's `type`. The resolver respects this; the
    -- CHECK stops raw-SQL inserts from creating an ambiguous rule.
    CONSTRAINT "price_list_assignments_target_consistency" CHECK (
        ("type" = 'customer' AND ("user_id" IS NOT NULL OR "business_account_id" IS NOT NULL)
                              AND "outlet_id" IS NULL AND "brand_id" IS NULL
                              AND "pincode" IS NULL AND "area" IS NULL AND "segment" IS NULL AND "brand_name" IS NULL)
        OR
        ("type" = 'outlet'   AND "outlet_id" IS NOT NULL
                              AND "user_id" IS NULL AND "business_account_id" IS NULL AND "brand_id" IS NULL
                              AND "pincode" IS NULL AND "area" IS NULL AND "segment" IS NULL AND "brand_name" IS NULL)
        OR
        ("type" = 'pincode'  AND "pincode" IS NOT NULL
                              AND "user_id" IS NULL AND "business_account_id" IS NULL AND "outlet_id" IS NULL
                              AND "brand_id" IS NULL AND "area" IS NULL AND "segment" IS NULL AND "brand_name" IS NULL)
        OR
        ("type" = 'area'     AND "area" IS NOT NULL
                              AND "user_id" IS NULL AND "business_account_id" IS NULL AND "outlet_id" IS NULL
                              AND "brand_id" IS NULL AND "pincode" IS NULL AND "segment" IS NULL AND "brand_name" IS NULL)
        OR
        ("type" = 'segment'  AND "segment" IS NOT NULL
                              AND "user_id" IS NULL AND "business_account_id" IS NULL AND "outlet_id" IS NULL
                              AND "brand_id" IS NULL AND "pincode" IS NULL AND "area" IS NULL AND "brand_name" IS NULL)
        OR
        ("type" = 'brand'    AND ("brand_id" IS NOT NULL OR "brand_name" IS NOT NULL)
                              AND "user_id" IS NULL AND "business_account_id" IS NULL AND "outlet_id" IS NULL
                              AND "pincode" IS NULL AND "area" IS NULL AND "segment" IS NULL)
    )
);

CREATE INDEX "price_list_assignments_price_list_id_type_idx"
    ON "price_list_assignments"("price_list_id", "type");
CREATE INDEX "price_list_assignments_user_id_idx" ON "price_list_assignments"("user_id");
CREATE INDEX "price_list_assignments_business_account_id_idx" ON "price_list_assignments"("business_account_id");
CREATE INDEX "price_list_assignments_outlet_id_idx" ON "price_list_assignments"("outlet_id");
CREATE INDEX "price_list_assignments_pincode_idx" ON "price_list_assignments"("pincode");
CREATE INDEX "price_list_assignments_brand_id_idx" ON "price_list_assignments"("brand_id");

ALTER TABLE "price_list_assignments"
    ADD CONSTRAINT "price_list_assignments_price_list_id_fkey"
    FOREIGN KEY ("price_list_id") REFERENCES "price_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "price_list_assignments"
    ADD CONSTRAINT "price_list_assignments_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "price_list_assignments"
    ADD CONSTRAINT "price_list_assignments_business_account_id_fkey"
    FOREIGN KEY ("business_account_id") REFERENCES "business_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "price_list_assignments"
    ADD CONSTRAINT "price_list_assignments_outlet_id_fkey"
    FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "price_list_assignments"
    ADD CONSTRAINT "price_list_assignments_brand_id_fkey"
    FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
