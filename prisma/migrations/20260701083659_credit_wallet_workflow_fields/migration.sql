-- CreateEnum
CREATE TYPE "credit_workflow_status" AS ENUM ('SANCTIONED', 'IN_PROGRESS', 'COMPLETED');

-- AlterTable
ALTER TABLE "credit_wallets" ADD COLUMN     "assigned_owner_id" UUID,
ADD COLUMN     "vendor_notes" TEXT,
ADD COLUMN     "workflow_status" "credit_workflow_status" NOT NULL DEFAULT 'IN_PROGRESS';

-- AddForeignKey
ALTER TABLE "credit_wallets" ADD CONSTRAINT "credit_wallets_assigned_owner_id_fkey" FOREIGN KEY ("assigned_owner_id") REFERENCES "vendor_team_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
