-- Reconcile the Pricelist Workspace (V2.2 Phase 5) "pricing-cell" attributes on
-- price_list_items. These columns were applied to dev/prod via `prisma db push`
-- without a migration, so a database rebuilt from migrations alone drifted from
-- schema.prisma (caught by the db-integrity CI job).
--
-- Written idempotently with IF NOT EXISTS so it CREATES the columns on a fresh
-- database (CI / new environments) and safely NO-OPS where db push already added
-- them (existing dev / prod), keeping `prisma migrate deploy` clean everywhere.
ALTER TABLE "price_list_items"
  ADD COLUMN IF NOT EXISTS "is_locked" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "valid_from" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "valid_to" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "note" TEXT,
  ADD COLUMN IF NOT EXISTS "scheduled_price" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "scheduled_from" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "scheduled_to" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "history" JSONB DEFAULT '[]';
