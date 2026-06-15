-- ═══════════════════════════════════════════════════════════════════════════
-- V2.2 HCID Architecture — Step A (additive nullable)
-- ═══════════════════════════════════════════════════════════════════════════
-- See docs/multi-account-rbac-implementation-plan.md
--
-- Migration is split into three steps:
--   Step A (this file): create new tables + add nullable columns to existing tables
--   Step B: data backfill (run prisma/migrations/20260520_hcid_architecture_step_a/data_migrate.ts)
--   Step C: enforce NOT NULL + drop legacy uniques + drop linked_accounts table
--           (migration file: 20260520_hcid_architecture_step_c)
--
-- Step A is SAFE to apply to a populated database — every new column is nullable
-- and no existing row is modified.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── new enums ─────────────────────────────────────────────────────────────
CREATE TYPE "BusinessAccountStatus" AS ENUM ('active', 'suspended', 'deactivated');
CREATE TYPE "RoleScope" AS ENUM ('account', 'vendor', 'brand', 'admin', 'delivery');

-- ── business_accounts ─────────────────────────────────────────────────────
CREATE TABLE "business_accounts" (
  "id"                   UUID                    NOT NULL DEFAULT gen_random_uuid(),
  "legal_name"           VARCHAR(255)            NOT NULL,
  "display_name"         VARCHAR(255),
  "gstin"                VARCHAR(20),
  "pan"                  VARCHAR(20),
  "business_type"        VARCHAR(50),
  "is_customer"          BOOLEAN                 NOT NULL DEFAULT TRUE,
  "is_vendor"            BOOLEAN                 NOT NULL DEFAULT FALSE,
  "is_brand"             BOOLEAN                 NOT NULL DEFAULT FALSE,
  "status"               "BusinessAccountStatus" NOT NULL DEFAULT 'active',
  "primary_outlet_id"    UUID,
  "created_at"           TIMESTAMPTZ             NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"           TIMESTAMPTZ             NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "business_accounts_pkey"               PRIMARY KEY ("id"),
  CONSTRAINT "business_accounts_primary_outlet_id_key" UNIQUE ("primary_outlet_id")
);

CREATE INDEX "business_accounts_is_vendor_idx" ON "business_accounts"("is_vendor");
CREATE INDEX "business_accounts_is_brand_idx"  ON "business_accounts"("is_brand");

-- ── business_account_members ──────────────────────────────────────────────
CREATE TABLE "business_account_members" (
  "id"                  UUID         NOT NULL DEFAULT gen_random_uuid(),
  "user_id"             UUID         NOT NULL,
  "business_account_id" UUID         NOT NULL,
  "is_primary"          BOOLEAN      NOT NULL DEFAULT FALSE,
  "invited_by"          UUID,
  "accepted_at"         TIMESTAMPTZ,
  "created_at"          TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "business_account_members_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "business_account_members_user_id_business_account_id_key"
    UNIQUE ("user_id", "business_account_id"),
  CONSTRAINT "business_account_members_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "business_account_members_business_account_id_fkey"
    FOREIGN KEY ("business_account_id") REFERENCES "business_accounts"("id") ON DELETE CASCADE,
  CONSTRAINT "business_account_members_invited_by_fkey"
    FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE INDEX "business_account_members_user_id_idx"             ON "business_account_members"("user_id");
CREATE INDEX "business_account_members_business_account_id_idx" ON "business_account_members"("business_account_id");

-- ── outlets ───────────────────────────────────────────────────────────────
CREATE TABLE "outlets" (
  "id"                      UUID         NOT NULL DEFAULT gen_random_uuid(),
  "business_account_id"     UUID         NOT NULL,
  "name"                    VARCHAR(255) NOT NULL,
  "code"                    VARCHAR(50),
  "address_line"            TEXT         NOT NULL,
  "flat_info"               VARCHAR(255),
  "landmark"                VARCHAR(255),
  "city"                    VARCHAR(100),
  "state"                   VARCHAR(100),
  "pincode"                 VARCHAR(10),
  "latitude"                DOUBLE PRECISION,
  "longitude"               DOUBLE PRECISION,
  "place_id"                VARCHAR(500),
  "is_active"               BOOLEAN      NOT NULL DEFAULT TRUE,
  "requires_address_update" BOOLEAN      NOT NULL DEFAULT FALSE,
  "created_at"              TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"              TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "outlets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "outlets_business_account_id_fkey"
    FOREIGN KEY ("business_account_id") REFERENCES "business_accounts"("id") ON DELETE CASCADE
);

CREATE INDEX "outlets_business_account_id_idx" ON "outlets"("business_account_id");
CREATE INDEX "outlets_pincode_idx"              ON "outlets"("pincode");

-- (Deferred FK from business_accounts.primary_outlet_id → outlets.id, added after both tables exist.)
ALTER TABLE "business_accounts"
  ADD CONSTRAINT "business_accounts_primary_outlet_id_fkey"
  FOREIGN KEY ("primary_outlet_id") REFERENCES "outlets"("id") ON DELETE SET NULL;

-- ── account_roles ─────────────────────────────────────────────────────────
CREATE TABLE "account_roles" (
  "id"                  UUID         NOT NULL DEFAULT gen_random_uuid(),
  "business_account_id" UUID,
  "name"                VARCHAR(100) NOT NULL,
  "description"         TEXT,
  "permissions"         JSONB        NOT NULL,
  "is_template"         BOOLEAN      NOT NULL DEFAULT FALSE,
  "scope"               "RoleScope"  NOT NULL DEFAULT 'account',
  "created_by"          UUID,
  "created_at"          TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "account_roles_pkey"                          PRIMARY KEY ("id"),
  CONSTRAINT "account_roles_business_account_id_name_key"  UNIQUE ("business_account_id", "name"),
  CONSTRAINT "account_roles_business_account_id_fkey"
    FOREIGN KEY ("business_account_id") REFERENCES "business_accounts"("id") ON DELETE CASCADE
);

CREATE INDEX "account_roles_is_template_scope_idx" ON "account_roles"("is_template", "scope");

-- ── user_roles (RBAC assignment) ──────────────────────────────────────────
CREATE TABLE "user_roles" (
  "id"                  UUID         NOT NULL DEFAULT gen_random_uuid(),
  "user_id"             UUID         NOT NULL,
  "business_account_id" UUID         NOT NULL,
  "outlet_id"           UUID,
  "role_id"             UUID         NOT NULL,
  "created_at"          TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_roles_user_id_business_account_id_outlet_id_role_id_key"
    UNIQUE NULLS NOT DISTINCT ("user_id", "business_account_id", "outlet_id", "role_id"),
  CONSTRAINT "user_roles_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "user_roles_business_account_id_fkey"
    FOREIGN KEY ("business_account_id") REFERENCES "business_accounts"("id") ON DELETE CASCADE,
  CONSTRAINT "user_roles_outlet_id_fkey"
    FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE CASCADE,
  CONSTRAINT "user_roles_role_id_fkey"
    FOREIGN KEY ("role_id") REFERENCES "account_roles"("id") ON DELETE RESTRICT
);

CREATE INDEX "user_roles_user_id_idx"             ON "user_roles"("user_id");
CREATE INDEX "user_roles_business_account_id_idx" ON "user_roles"("business_account_id");

-- ── User: hcid_display ────────────────────────────────────────────────────
ALTER TABLE "users" ADD COLUMN "hcid_display" VARCHAR(20);
CREATE UNIQUE INDEX "users_hcid_display_key" ON "users"("hcid_display");

-- ── Vendor: business_account_id (nullable for Step A) ─────────────────────
ALTER TABLE "vendors" ADD COLUMN "business_account_id" UUID;
ALTER TABLE "vendors"
  ADD CONSTRAINT "vendors_business_account_id_fkey"
  FOREIGN KEY ("business_account_id") REFERENCES "business_accounts"("id") ON DELETE SET NULL;
CREATE UNIQUE INDEX "vendors_business_account_id_key" ON "vendors"("business_account_id");

-- ── Brand: business_account_id (nullable for Step A) ──────────────────────
ALTER TABLE "brands" ADD COLUMN "business_account_id" UUID;
ALTER TABLE "brands"
  ADD CONSTRAINT "brands_business_account_id_fkey"
  FOREIGN KEY ("business_account_id") REFERENCES "business_accounts"("id") ON DELETE SET NULL;
CREATE UNIQUE INDEX "brands_business_account_id_key" ON "brands"("business_account_id");

-- ── Cart: business_account_id + outlet_id (nullable for Step A) ───────────
ALTER TABLE "carts" ADD COLUMN "business_account_id" UUID;
ALTER TABLE "carts" ADD COLUMN "outlet_id"           UUID;
ALTER TABLE "carts"
  ADD CONSTRAINT "carts_business_account_id_fkey"
  FOREIGN KEY ("business_account_id") REFERENCES "business_accounts"("id") ON DELETE SET NULL;
ALTER TABLE "carts"
  ADD CONSTRAINT "carts_outlet_id_fkey"
  FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE SET NULL;

-- ── Order: business_account_id + outlet_id + delivery_address_snapshot ────
ALTER TABLE "orders" ADD COLUMN "business_account_id"        UUID;
ALTER TABLE "orders" ADD COLUMN "outlet_id"                  UUID;
ALTER TABLE "orders" ADD COLUMN "delivery_address_snapshot"  JSONB;
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_business_account_id_fkey"
  FOREIGN KEY ("business_account_id") REFERENCES "business_accounts"("id") ON DELETE SET NULL;
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_outlet_id_fkey"
  FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE SET NULL;
CREATE INDEX "orders_business_account_id_idx" ON "orders"("business_account_id");
CREATE INDEX "orders_outlet_id_idx"           ON "orders"("outlet_id");

-- ── QuickOrderList: business_account_id (nullable for Step A) ─────────────
ALTER TABLE "quick_order_lists" ADD COLUMN "business_account_id" UUID;
ALTER TABLE "quick_order_lists"
  ADD CONSTRAINT "quick_order_lists_business_account_id_fkey"
  FOREIGN KEY ("business_account_id") REFERENCES "business_accounts"("id") ON DELETE SET NULL;
CREATE INDEX "quick_order_lists_business_account_id_idx" ON "quick_order_lists"("business_account_id");

-- ── CustomerVendor: business_account_id (nullable for Step A) ─────────────
ALTER TABLE "customer_vendors" ADD COLUMN "business_account_id" UUID;
ALTER TABLE "customer_vendors"
  ADD CONSTRAINT "customer_vendors_business_account_id_fkey"
  FOREIGN KEY ("business_account_id") REFERENCES "business_accounts"("id") ON DELETE SET NULL;
CREATE INDEX "customer_vendors_business_account_id_idx" ON "customer_vendors"("business_account_id");

-- ── SavedAddress: outlet_id (nullable for Step A) ─────────────────────────
ALTER TABLE "saved_addresses" ADD COLUMN "outlet_id" UUID;
ALTER TABLE "saved_addresses"
  ADD CONSTRAINT "saved_addresses_outlet_id_fkey"
  FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE SET NULL;
CREATE INDEX "saved_addresses_outlet_id_idx" ON "saved_addresses"("outlet_id");

-- ═══════════════════════════════════════════════════════════════════════════
-- End of Step A. After this migration applies:
--   1. Run prisma/migrations/20260520_hcid_architecture_step_a/data_migrate.ts
--      to backfill all new nullable columns.
--   2. Apply Step C migration to enforce NOT NULL + drop legacy.
-- ═══════════════════════════════════════════════════════════════════════════
