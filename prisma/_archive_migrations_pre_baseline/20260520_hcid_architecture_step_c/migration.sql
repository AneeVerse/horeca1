-- ═══════════════════════════════════════════════════════════════════════════
-- V2.2 HCID Architecture — Step C (enforce constraints, drop legacy)
-- ═══════════════════════════════════════════════════════════════════════════
-- See docs/multi-account-rbac-implementation-plan.md
--
-- Run ONLY AFTER:
--   1. 20260520_hcid_architecture_step_a/migration.sql applied
--   2. 20260520_hcid_architecture_step_a/data_migrate.ts completed successfully
--      (verify: SELECT COUNT(*) FROM orders WHERE business_account_id IS NULL; = 0)
--
-- This step is the point of no return for the LinkedAccount table.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Safety pre-checks (these will FAIL the migration if backfill is incomplete) ──
DO $$
DECLARE
  unmigrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unmigrated_count FROM "vendors" WHERE "business_account_id" IS NULL;
  IF unmigrated_count > 0 THEN
    RAISE EXCEPTION 'Step C aborted: % vendor(s) without business_account_id. Run data_migrate.ts first.', unmigrated_count;
  END IF;

  SELECT COUNT(*) INTO unmigrated_count FROM "brands" WHERE "business_account_id" IS NULL;
  IF unmigrated_count > 0 THEN
    RAISE EXCEPTION 'Step C aborted: % brand(s) without business_account_id.', unmigrated_count;
  END IF;

  SELECT COUNT(*) INTO unmigrated_count FROM "orders" WHERE "business_account_id" IS NULL OR "outlet_id" IS NULL;
  IF unmigrated_count > 0 THEN
    RAISE EXCEPTION 'Step C aborted: % order(s) without business_account_id or outlet_id.', unmigrated_count;
  END IF;

  SELECT COUNT(*) INTO unmigrated_count FROM "carts" WHERE "business_account_id" IS NULL OR "outlet_id" IS NULL;
  IF unmigrated_count > 0 THEN
    RAISE EXCEPTION 'Step C aborted: % cart(s) without business_account_id or outlet_id.', unmigrated_count;
  END IF;

  SELECT COUNT(*) INTO unmigrated_count FROM "quick_order_lists" WHERE "business_account_id" IS NULL;
  IF unmigrated_count > 0 THEN
    RAISE EXCEPTION 'Step C aborted: % quick_order_list(s) without business_account_id.', unmigrated_count;
  END IF;

  SELECT COUNT(*) INTO unmigrated_count FROM "customer_vendors" WHERE "business_account_id" IS NULL;
  IF unmigrated_count > 0 THEN
    RAISE EXCEPTION 'Step C aborted: % customer_vendor row(s) without business_account_id.', unmigrated_count;
  END IF;

  SELECT COUNT(*) INTO unmigrated_count FROM "users" WHERE "hcid_display" IS NULL;
  IF unmigrated_count > 0 THEN
    RAISE EXCEPTION 'Step C aborted: % user(s) without hcid_display.', unmigrated_count;
  END IF;
END $$;

-- ── enforce NOT NULL on the new tenant columns ────────────────────────────
ALTER TABLE "vendors"           ALTER COLUMN "business_account_id" SET NOT NULL;
ALTER TABLE "brands"            ALTER COLUMN "business_account_id" SET NOT NULL;
ALTER TABLE "carts"             ALTER COLUMN "business_account_id" SET NOT NULL,
                                ALTER COLUMN "outlet_id"           SET NOT NULL;
ALTER TABLE "orders"            ALTER COLUMN "business_account_id" SET NOT NULL,
                                ALTER COLUMN "outlet_id"           SET NOT NULL,
                                ALTER COLUMN "delivery_address_snapshot" SET NOT NULL;
ALTER TABLE "quick_order_lists" ALTER COLUMN "business_account_id" SET NOT NULL;
ALTER TABLE "customer_vendors"  ALTER COLUMN "business_account_id" SET NOT NULL;
ALTER TABLE "users"             ALTER COLUMN "hcid_display"        SET NOT NULL;

-- ── Cart re-key: drop legacy unique, add composite ────────────────────────
ALTER TABLE "carts" DROP CONSTRAINT IF EXISTS "carts_user_id_key";
ALTER TABLE "carts"
  ADD CONSTRAINT "carts_user_id_business_account_id_outlet_id_key"
  UNIQUE ("user_id", "business_account_id", "outlet_id");

-- ── CustomerVendor re-key: drop legacy unique, add account-scoped one ─────
ALTER TABLE "customer_vendors" DROP CONSTRAINT IF EXISTS "customer_vendors_user_id_vendor_id_key";
ALTER TABLE "customer_vendors"
  ADD CONSTRAINT "customer_vendors_business_account_id_vendor_id_key"
  UNIQUE ("business_account_id", "vendor_id");

-- ── Drop LinkedAccount (replaced by business_account_members) ─────────────
DROP TABLE IF EXISTS "linked_accounts";

-- ═══════════════════════════════════════════════════════════════════════════
-- End of Step C. The V2.2 HCID architecture is now structurally enforced.
-- Application code (auth.ts, resolvers, services, routes, UI) must be deployed
-- in the same release that runs this migration.
-- ═══════════════════════════════════════════════════════════════════════════
