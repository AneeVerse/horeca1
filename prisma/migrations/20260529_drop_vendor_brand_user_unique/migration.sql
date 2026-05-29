-- Drop UNIQUE on vendors.user_id and brands.user_id so one User can own
-- multiple vendor / brand profiles (one per BusinessAccount), matching the
-- V2.2 HCID multi-account architecture. The (vendor.business_account_id,
-- brand.business_account_id) uniqueness stays — that's the real invariant.

ALTER TABLE "vendors" DROP CONSTRAINT IF EXISTS "vendors_user_id_key";
ALTER TABLE "brands"  DROP CONSTRAINT IF EXISTS "brands_user_id_key";

-- Re-create as plain indexes since these columns are still queried often.
CREATE INDEX IF NOT EXISTS "vendors_user_id_idx" ON "vendors"("user_id");
CREATE INDEX IF NOT EXISTS "brands_user_id_idx"  ON "brands"("user_id");
