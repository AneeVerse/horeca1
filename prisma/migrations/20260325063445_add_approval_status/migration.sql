-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "approval_note" TEXT,
ADD COLUMN     "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'approved',
ADD COLUMN     "approved_at" TIMESTAMPTZ,
ADD COLUMN     "approved_by" UUID,
ADD COLUMN     "suggested_by" UUID;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "approval_note" TEXT,
ADD COLUMN     "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'pending',
ADD COLUMN     "approved_at" TIMESTAMPTZ,
ADD COLUMN     "approved_by" UUID;

-- Set all existing products to approved so they remain visible
UPDATE "products" SET "approval_status" = 'approved' WHERE "approval_status" = 'pending';

-- CreateIndex
CREATE INDEX "categories_approval_status_idx" ON "categories"("approval_status");

-- CreateIndex
CREATE INDEX "products_approval_status_idx" ON "products"("approval_status");
