-- Vendor onboarding wizard fields
-- Collected at /vendor/register before admin approval

ALTER TABLE "vendors"
  ADD COLUMN IF NOT EXISTS "trade_name" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "vendor_type" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "pan_number" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "authorized_person_name" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "authorized_person_phone" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "authorized_person_email" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "pickup_address_line" TEXT,
  ADD COLUMN IF NOT EXISTS "pickup_city" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "pickup_state" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "pickup_pincode" VARCHAR(10),
  ADD COLUMN IF NOT EXISTS "delivery_capability" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "fssai_number" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "udyam_number" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "cin_number" VARCHAR(50);
