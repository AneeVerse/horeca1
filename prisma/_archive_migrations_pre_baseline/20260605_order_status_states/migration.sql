-- V2.2 Phase 5 — richer order states per the client Order-Management spec.
-- Additive enum values only; existing rows + transitions are unaffected.
-- Postgres 16 allows ADD VALUE inside migrate deploy's transaction because the
-- new labels are not used within this same migration.

ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'draft' BEFORE 'pending';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'ready_for_dispatch' AFTER 'processing';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'partially_delivered' AFTER 'shipped';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'returned' AFTER 'delivered';
