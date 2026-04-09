-- CreateEnum
CREATE TYPE "MappingStatus" AS ENUM ('auto_mapped', 'pending_review', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "MatchMethod" AS ENUM ('rule_based', 'manually_verified');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'brand';

-- CreateTable
CREATE TABLE "brands" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "logo_url" VARCHAR(512),
    "banner_url" VARCHAR(512),
    "website" VARCHAR(512),
    "tagline" VARCHAR(512),
    "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'pending',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_master_products" (
    "id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "category_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "image_url" VARCHAR(512),
    "pack_size" VARCHAR(100),
    "unit" VARCHAR(50),
    "sku" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_master_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_product_mappings" (
    "id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "brand_master_product_id" UUID NOT NULL,
    "distributor_product_id" UUID NOT NULL,
    "confidence_score" DECIMAL(4,3) NOT NULL DEFAULT 0,
    "status" "MappingStatus" NOT NULL DEFAULT 'pending_review',
    "matched_by" "MatchMethod" NOT NULL,
    "reviewed_by" UUID,
    "review_note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_product_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "brands_user_id_key" ON "brands"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "brands_name_key" ON "brands"("name");

-- CreateIndex
CREATE UNIQUE INDEX "brands_slug_key" ON "brands"("slug");

-- CreateIndex
CREATE INDEX "brands_slug_idx" ON "brands"("slug");

-- CreateIndex
CREATE INDEX "brands_approval_status_idx" ON "brands"("approval_status");

-- CreateIndex
CREATE INDEX "brand_master_products_brand_id_idx" ON "brand_master_products"("brand_id");

-- CreateIndex
CREATE INDEX "brand_master_products_category_id_idx" ON "brand_master_products"("category_id");

-- CreateIndex
CREATE INDEX "brand_product_mappings_brand_id_idx" ON "brand_product_mappings"("brand_id");

-- CreateIndex
CREATE INDEX "brand_product_mappings_status_idx" ON "brand_product_mappings"("status");

-- CreateIndex
CREATE UNIQUE INDEX "brand_product_mappings_brand_master_product_id_distributor__key" ON "brand_product_mappings"("brand_master_product_id", "distributor_product_id");

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_master_products" ADD CONSTRAINT "brand_master_products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_master_products" ADD CONSTRAINT "brand_master_products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_product_mappings" ADD CONSTRAINT "brand_product_mappings_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_product_mappings" ADD CONSTRAINT "brand_product_mappings_brand_master_product_id_fkey" FOREIGN KEY ("brand_master_product_id") REFERENCES "brand_master_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_product_mappings" ADD CONSTRAINT "brand_product_mappings_distributor_product_id_fkey" FOREIGN KEY ("distributor_product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
