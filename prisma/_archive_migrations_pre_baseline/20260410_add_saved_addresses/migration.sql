-- CreateTable
CREATE TABLE "saved_addresses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "label" VARCHAR(50) NOT NULL DEFAULT 'Other',
    "business_name" VARCHAR(255),
    "full_address" TEXT NOT NULL,
    "short_address" VARCHAR(255),
    "flat_info" VARCHAR(255),
    "landmark" VARCHAR(255),
    "pincode" VARCHAR(10),
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "place_id" VARCHAR(500),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_addresses_user_id_idx" ON "saved_addresses"("user_id");

-- AddForeignKey
ALTER TABLE "saved_addresses" ADD CONSTRAINT "saved_addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
