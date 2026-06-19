-- CreateTable
CREATE TABLE "product_combos" (
    "id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "combo_price" DECIMAL(10,2) NOT NULL,
    "original_price" DECIMAL(10,2),
    "image_url" VARCHAR(512),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "valid_from" TIMESTAMPTZ,
    "valid_to" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_combos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combo_items" (
    "id" UUID NOT NULL,
    "combo_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "combo_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_combos_vendor_id_idx" ON "product_combos"("vendor_id");

-- CreateIndex
CREATE INDEX "product_combos_is_active_idx" ON "product_combos"("is_active");

-- CreateIndex
CREATE INDEX "combo_items_combo_id_idx" ON "combo_items"("combo_id");

-- CreateIndex
CREATE INDEX "combo_items_product_id_idx" ON "combo_items"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "combo_items_combo_id_product_id_key" ON "combo_items"("combo_id", "product_id");

-- AddForeignKey
ALTER TABLE "product_combos" ADD CONSTRAINT "product_combos_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_items" ADD CONSTRAINT "combo_items_combo_id_fkey" FOREIGN KEY ("combo_id") REFERENCES "product_combos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_items" ADD CONSTRAINT "combo_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
