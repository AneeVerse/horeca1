-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('owner', 'manager', 'editor', 'viewer');

-- CreateTable
CREATE TABLE "vendor_team_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "TeamRole" NOT NULL DEFAULT 'viewer',
    "invited_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_team_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "brand_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "TeamRole" NOT NULL DEFAULT 'viewer',
    "invited_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_team_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "role" "TeamRole" NOT NULL DEFAULT 'viewer',
    "invited_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vendor_team_members_user_id_idx" ON "vendor_team_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_team_members_vendor_id_user_id_key" ON "vendor_team_members"("vendor_id", "user_id");

-- CreateIndex
CREATE INDEX "brand_team_members_user_id_idx" ON "brand_team_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "brand_team_members_brand_id_user_id_key" ON "brand_team_members"("brand_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_team_members_user_id_key" ON "admin_team_members"("user_id");

-- AddForeignKey
ALTER TABLE "vendor_team_members" ADD CONSTRAINT "vendor_team_members_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_team_members" ADD CONSTRAINT "vendor_team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_team_members" ADD CONSTRAINT "vendor_team_members_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_team_members" ADD CONSTRAINT "brand_team_members_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_team_members" ADD CONSTRAINT "brand_team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_team_members" ADD CONSTRAINT "brand_team_members_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_team_members" ADD CONSTRAINT "admin_team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_team_members" ADD CONSTRAINT "admin_team_members_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
