-- Add order fulfillment workflow fields
-- Phase 0: Fix order state machine and inventory lifecycle

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "accepted_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "rejected_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "is_partial" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE "order_items"
  ADD COLUMN IF NOT EXISTS "fulfilled_qty" INTEGER NOT NULL DEFAULT 0;
