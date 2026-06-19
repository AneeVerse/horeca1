-- Profile Mastersheet columns for Vendor (Tier A) and Brand (Tier A + Tier B).
-- GSTIN stays on business_accounts; Brand.product categories use brands.categories.

-- AlterTable
ALTER TABLE "vendors" ADD COLUMN "sub_type" VARCHAR(80),
ADD COLUMN "categories_handled" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "business_size" VARCHAR(50),
ADD COLUMN "coverage" VARCHAR(120),
ADD COLUMN "warehouse_count" INTEGER,
ADD COLUMN "delivery_fleet" BOOLEAN,
ADD COLUMN "monthly_supply_band" VARCHAR(50);

-- AlterTable
ALTER TABLE "brands" ADD COLUMN "brand_type" VARCHAR(80),
ADD COLUMN "sub_type" VARCHAR(80),
ADD COLUMN "business_size" VARCHAR(50),
ADD COLUMN "distribution_presence" VARCHAR(120),
ADD COLUMN "target_segments" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "horeca_focused" BOOLEAN,
ADD COLUMN "retail_focused" BOOLEAN,
ADD COLUMN "brand_tier" VARCHAR(50),
ADD COLUMN "marketplace_visibility" VARCHAR(50),
ADD COLUMN "credit_support" BOOLEAN,
ADD COLUMN "lead_status" VARCHAR(50);
