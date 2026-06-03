-- V2.2 Phase 1 — Salesman Commission (structure-only)
-- Adds Salesperson, CommissionRule, CommissionAccrual + FKs on
-- vendor_customers and orders. Accruals are auto-generated on
-- order.delivered (see commission.service.ts); no payout pipeline.

-- ── Enums ──────────────────────────────────────────────────────────────
CREATE TYPE "commission_rule_scope" AS ENUM ('default', 'customer', 'brand', 'category');

CREATE TYPE "commission_accrual_status" AS ENUM ('pending', 'approved', 'paid', 'cancelled');

-- ── Salesperson ────────────────────────────────────────────────────────
CREATE TABLE "salespersons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(15),
    "email" VARCHAR(255),
    "code" VARCHAR(30),
    "user_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salespersons_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "salespersons_vendor_id_code_key" ON "salespersons"("vendor_id", "code");
CREATE INDEX "salespersons_vendor_id_idx" ON "salespersons"("vendor_id");
CREATE INDEX "salespersons_user_id_idx" ON "salespersons"("user_id");

ALTER TABLE "salespersons"
    ADD CONSTRAINT "salespersons_vendor_id_fkey"
    FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "salespersons"
    ADD CONSTRAINT "salespersons_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── CommissionRule ─────────────────────────────────────────────────────
CREATE TABLE "commission_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "salesperson_id" UUID NOT NULL,
    "scope" "commission_rule_scope" NOT NULL,
    "scope_ref_id" UUID,
    "rate_percent" DECIMAL(5, 2),
    "rate_fixed" DECIMAL(12, 2),
    "min_order_value" DECIMAL(12, 2),
    "valid_from" TIMESTAMPTZ,
    "valid_to" TIMESTAMPTZ,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_rules_pkey" PRIMARY KEY ("id"),
    -- Hard guarantee: exactly one of (rate_percent, rate_fixed) is set.
    -- App layer validates too but the DB stops bypass via raw SQL.
    CONSTRAINT "commission_rules_rate_xor" CHECK (
        ("rate_percent" IS NOT NULL AND "rate_fixed" IS NULL)
        OR
        ("rate_percent" IS NULL AND "rate_fixed" IS NOT NULL)
    ),
    -- scope_ref_id is REQUIRED when scope != 'default' and FORBIDDEN
    -- when scope = 'default'. Keeps rule resolution unambiguous.
    CONSTRAINT "commission_rules_scope_ref_consistency" CHECK (
        ("scope" = 'default' AND "scope_ref_id" IS NULL)
        OR
        ("scope" <> 'default' AND "scope_ref_id" IS NOT NULL)
    )
);

CREATE INDEX "commission_rules_vendor_id_salesperson_id_is_active_idx"
    ON "commission_rules"("vendor_id", "salesperson_id", "is_active");
CREATE INDEX "commission_rules_scope_scope_ref_id_idx"
    ON "commission_rules"("scope", "scope_ref_id");

ALTER TABLE "commission_rules"
    ADD CONSTRAINT "commission_rules_vendor_id_fkey"
    FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "commission_rules"
    ADD CONSTRAINT "commission_rules_salesperson_id_fkey"
    FOREIGN KEY ("salesperson_id") REFERENCES "salespersons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── CommissionAccrual ──────────────────────────────────────────────────
CREATE TABLE "commission_accruals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "salesperson_id" UUID NOT NULL,
    "rule_id" UUID,
    "base_amount" DECIMAL(12, 2) NOT NULL,
    "rate_percent" DECIMAL(5, 2),
    "rate_fixed" DECIMAL(12, 2),
    "accrued_amount" DECIMAL(12, 2) NOT NULL,
    "period" VARCHAR(7) NOT NULL,
    "status" "commission_accrual_status" NOT NULL DEFAULT 'pending',
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ,
    "paid_at" TIMESTAMPTZ,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_accruals_pkey" PRIMARY KEY ("id"),
    -- Idempotent: one accrual per (order, salesperson). The status hook
    -- on order.delivered can fire twice on retry; the unique constraint
    -- turns the second insert into a no-op via ON CONFLICT.
    CONSTRAINT "commission_accruals_order_salesperson_unique"
        UNIQUE ("order_id", "salesperson_id")
);

CREATE INDEX "commission_accruals_vendor_id_period_status_idx"
    ON "commission_accruals"("vendor_id", "period", "status");
CREATE INDEX "commission_accruals_salesperson_id_period_idx"
    ON "commission_accruals"("salesperson_id", "period");

ALTER TABLE "commission_accruals"
    ADD CONSTRAINT "commission_accruals_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "commission_accruals"
    ADD CONSTRAINT "commission_accruals_vendor_id_fkey"
    FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "commission_accruals"
    ADD CONSTRAINT "commission_accruals_salesperson_id_fkey"
    FOREIGN KEY ("salesperson_id") REFERENCES "salespersons"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "commission_accruals"
    ADD CONSTRAINT "commission_accruals_rule_id_fkey"
    FOREIGN KEY ("rule_id") REFERENCES "commission_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "commission_accruals"
    ADD CONSTRAINT "commission_accruals_approved_by_fkey"
    FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── FKs on existing tables ────────────────────────────────────────────
-- VendorCustomer: replace the free-text salesExecutive with a FK to
-- Salesperson. We keep the existing string column for one release cycle
-- so admin bulk-import scripts continue to parse old files.
ALTER TABLE "vendor_customers"
    ADD COLUMN "salesperson_id" UUID;

CREATE INDEX "vendor_customers_salesperson_id_idx"
    ON "vendor_customers"("salesperson_id");

ALTER TABLE "vendor_customers"
    ADD CONSTRAINT "vendor_customers_salesperson_id_fkey"
    FOREIGN KEY ("salesperson_id") REFERENCES "salespersons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Order: salesperson snapshot at order creation. Survives later
-- reassignment of the customer's salesperson.
ALTER TABLE "orders"
    ADD COLUMN "salesperson_id" UUID;

CREATE INDEX "orders_salesperson_id_idx" ON "orders"("salesperson_id");

ALTER TABLE "orders"
    ADD CONSTRAINT "orders_salesperson_id_fkey"
    FOREIGN KEY ("salesperson_id") REFERENCES "salespersons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
