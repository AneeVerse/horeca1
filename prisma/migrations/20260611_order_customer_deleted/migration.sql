-- Customer-side soft delete for orders ("remove from history").
-- IF NOT EXISTS because the live DB already received this column via `prisma db push`
-- before the migration was written; fresh databases create it here.
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "customer_deleted" BOOLEAN NOT NULL DEFAULT false;
