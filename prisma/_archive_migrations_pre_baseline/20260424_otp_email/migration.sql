-- Allow email-based OTP codes alongside the existing phone-based ones.
ALTER TABLE "otp_codes" ALTER COLUMN "phone" DROP NOT NULL;
ALTER TABLE "otp_codes" ADD COLUMN "email" VARCHAR(320);
CREATE INDEX "otp_codes_email_idx" ON "otp_codes"("email");
