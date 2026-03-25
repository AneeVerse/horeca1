-- AlterTable
ALTER TABLE "price_slabs" ADD COLUMN     "promo_price" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "promo_end_time" VARCHAR(5),
ADD COLUMN     "promo_price" DECIMAL(10,2),
ADD COLUMN     "promo_start_time" VARCHAR(5);
