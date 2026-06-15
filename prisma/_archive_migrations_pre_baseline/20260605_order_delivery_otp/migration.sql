-- V2.2 Phase 5 — Order delivery OTP proof
-- Additive only: three nullable columns on orders. Existing rows + the
-- non-OTP delivery flow are unaffected.

ALTER TABLE "orders" ADD COLUMN "delivery_otp" VARCHAR(6);
ALTER TABLE "orders" ADD COLUMN "delivery_otp_expires_at" TIMESTAMPTZ;
ALTER TABLE "orders" ADD COLUMN "delivery_otp_verified_at" TIMESTAMPTZ;
