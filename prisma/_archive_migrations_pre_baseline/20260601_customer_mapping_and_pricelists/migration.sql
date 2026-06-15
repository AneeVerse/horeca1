-- ═══════════════════════════════════════════════════════════════════════════
-- V2.2 — Customer Mapping Engine + PriceList base tables
-- ═══════════════════════════════════════════════════════════════════════════
-- BACKFILL of a migration that was never authored. The models VendorCustomer,
-- VendorCustomerTask, VendorCustomerPrice, PriceList and PriceListItem were
-- added to schema.prisma and pushed to the production database with
-- `prisma db push`, but no CREATE TABLE migration was ever committed. As a
-- result `prisma migrate deploy` against a fresh database failed at
-- 20260602_salesman_commission (which ALTERs "vendor_customers") and would
-- have failed at 20260603_pricelist_assignments (which FKs "price_lists").
--
-- This migration creates those five tables in the shape they had BEFORE the
-- two later migrations extend them, so the full chain replays cleanly:
--   • "vendor_customers"  is created WITHOUT "salesperson_id"
--                         (20260602_salesman_commission adds it).
--   • "price_list_items"  is created with "custom_price" NOT NULL and WITHOUT
--                         pricing_type/discount_percent/scheme_min_qty/
--                         scheme_free_qty (20260603_pricelist_assignments
--                         relaxes the NOT NULL and adds those columns).
--
-- Additive only. Safe on a populated database. On environments where these
-- tables already exist (production, built via db push), mark this migration as
-- already-applied instead of running it:
--   prisma migrate resolve --applied 20260601_customer_mapping_and_pricelists
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Enums ──────────────────────────────────────────────────────────────────
CREATE TYPE "VendorCustomerStatus" AS ENUM ('active', 'blocked', 'suspended');

-- ── PriceList ────────────────────────────────────────────────────────────────
CREATE TABLE "price_lists" (
    "id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_lists_pkey" PRIMARY KEY ("id")
);

-- ── PriceListItem (pre-20260603 shape) ───────────────────────────────────────
CREATE TABLE "price_list_items" (
    "id" UUID NOT NULL,
    "price_list_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "custom_price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_list_items_pkey" PRIMARY KEY ("id")
);

-- ── VendorCustomer (pre-20260602 shape — no salesperson_id) ───────────────────
CREATE TABLE "vendor_customers" (
    "id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "VendorCustomerStatus" NOT NULL DEFAULT 'active',
    "price_list_id" UUID,
    "territory" VARCHAR(100),
    "sales_executive" VARCHAR(100),
    "delivery_route" VARCHAR(100),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "payment_terms" VARCHAR(50),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_customers_pkey" PRIMARY KEY ("id")
);

-- ── VendorCustomerTask ───────────────────────────────────────────────────────
CREATE TABLE "vendor_customer_tasks" (
    "id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "notes" TEXT,
    "due_date" TIMESTAMPTZ,
    "is_done" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "vendor_customer_tasks_pkey" PRIMARY KEY ("id")
);

-- ── VendorCustomerPrice ──────────────────────────────────────────────────────
CREATE TABLE "vendor_customer_prices" (
    "id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "vendor_customer_prices_pkey" PRIMARY KEY ("id")
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX "price_lists_vendor_id_idx" ON "price_lists"("vendor_id");
CREATE UNIQUE INDEX "price_lists_vendor_id_name_key" ON "price_lists"("vendor_id", "name");

CREATE INDEX "price_list_items_price_list_id_idx" ON "price_list_items"("price_list_id");
CREATE UNIQUE INDEX "price_list_items_price_list_id_product_id_key" ON "price_list_items"("price_list_id", "product_id");

CREATE INDEX "vendor_customers_vendor_id_idx" ON "vendor_customers"("vendor_id");
CREATE INDEX "vendor_customers_user_id_idx" ON "vendor_customers"("user_id");
CREATE UNIQUE INDEX "vendor_customers_vendor_id_user_id_key" ON "vendor_customers"("vendor_id", "user_id");

CREATE INDEX "vendor_customer_tasks_vendor_id_customer_id_idx" ON "vendor_customer_tasks"("vendor_id", "customer_id");

CREATE UNIQUE INDEX "vendor_customer_prices_vendor_id_customer_id_product_id_key" ON "vendor_customer_prices"("vendor_id", "customer_id", "product_id");

-- ── Foreign keys ─────────────────────────────────────────────────────────────
ALTER TABLE "price_lists"
    ADD CONSTRAINT "price_lists_vendor_id_fkey"
    FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "price_list_items"
    ADD CONSTRAINT "price_list_items_price_list_id_fkey"
    FOREIGN KEY ("price_list_id") REFERENCES "price_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "price_list_items"
    ADD CONSTRAINT "price_list_items_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "vendor_customers"
    ADD CONSTRAINT "vendor_customers_vendor_id_fkey"
    FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "vendor_customers"
    ADD CONSTRAINT "vendor_customers_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "vendor_customers"
    ADD CONSTRAINT "vendor_customers_price_list_id_fkey"
    FOREIGN KEY ("price_list_id") REFERENCES "price_lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "vendor_customer_tasks"
    ADD CONSTRAINT "vendor_customer_tasks_vendor_id_fkey"
    FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "vendor_customer_prices"
    ADD CONSTRAINT "vendor_customer_prices_vendor_id_fkey"
    FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "vendor_customer_prices"
    ADD CONSTRAINT "vendor_customer_prices_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
