-- Approval state machine: additive states. Non-destructive — ADD VALUE only, no
-- existing value renamed or removed. Postgres requires each ADD VALUE to run
-- outside an explicit transaction block; Prisma applies enum-only migrations that way.

ALTER TYPE "ApprovalStatus" ADD VALUE IF NOT EXISTS 'under_review';
ALTER TYPE "ApprovalStatus" ADD VALUE IF NOT EXISTS 'needs_changes';
ALTER TYPE "ApprovalStatus" ADD VALUE IF NOT EXISTS 'archived';
