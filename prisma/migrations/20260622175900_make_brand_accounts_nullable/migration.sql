-- DropForeignKey
ALTER TABLE "brands" DROP CONSTRAINT IF EXISTS "brands_user_id_fkey";

-- DropForeignKey
ALTER TABLE "brands" DROP CONSTRAINT IF EXISTS "brands_business_account_id_fkey";

-- AlterTable
ALTER TABLE "brands" ALTER COLUMN "user_id" DROP NOT NULL,
ALTER COLUMN "business_account_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_business_account_id_fkey" FOREIGN KEY ("business_account_id") REFERENCES "business_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
