-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "BrandDistributorInviteStatus" AS ENUM ('pending', 'contacted', 'onboarded', 'declined');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "brand_distributor_invites" (
    "id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "contact_name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(30),
    "business_name" VARCHAR(255) NOT NULL,
    "city" VARCHAR(100),
    "pincode" VARCHAR(10),
    "notes" TEXT,
    "status" "BrandDistributorInviteStatus" NOT NULL DEFAULT 'pending',
    "vendor_id" UUID,
    "reviewed_by" UUID,
    "review_note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_distributor_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "brand_distributor_invites_brand_id_idx" ON "brand_distributor_invites"("brand_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "brand_distributor_invites_status_idx" ON "brand_distributor_invites"("status");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "brand_distributor_invites" ADD CONSTRAINT "brand_distributor_invites_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
