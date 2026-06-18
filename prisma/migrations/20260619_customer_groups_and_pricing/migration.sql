-- @transaction false

-- AlterTable
ALTER TABLE "price_lists" ADD COLUMN "valid_from" TIMESTAMPTZ, ADD COLUMN "valid_to" TIMESTAMPTZ;

-- AlterEnum
ALTER TYPE "price_list_assignment_type" ADD VALUE 'group';

-- AlterTable
ALTER TABLE "price_list_assignments" ADD COLUMN "group_id" UUID, ADD COLUMN "assigned_by_id" UUID, ADD COLUMN "assigned_at" TIMESTAMPTZ;

-- CreateTable
CREATE TABLE "customer_groups" (
    "id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_group_members" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "user_id" UUID,
    "business_account_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_groups_vendor_id_name_key" ON "customer_groups"("vendor_id", "name");

-- CreateIndex
CREATE INDEX "customer_groups_vendor_id_idx" ON "customer_groups"("vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_group_members_group_id_user_id_key" ON "customer_group_members"("group_id", "user_id");

-- CreateIndex
CREATE INDEX "customer_group_members_group_id_idx" ON "customer_group_members"("group_id");

-- CreateIndex
CREATE INDEX "price_list_assignments_group_id_idx" ON "price_list_assignments"("group_id");

-- AddForeignKey
ALTER TABLE "price_list_assignments" ADD CONSTRAINT "price_list_assignments_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "customer_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_groups" ADD CONSTRAINT "customer_groups_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_group_members" ADD CONSTRAINT "customer_group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "customer_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
