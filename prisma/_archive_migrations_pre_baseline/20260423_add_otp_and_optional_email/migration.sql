-- Make email nullable (OTP users don't have email)
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;

-- OTP codes table
CREATE TABLE "otp_codes" (
    "id"         UUID        NOT NULL DEFAULT gen_random_uuid(),
    "phone"      VARCHAR(20) NOT NULL,
    "code"       VARCHAR(6)  NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used"       BOOLEAN     NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "otp_codes_phone_idx" ON "otp_codes"("phone");
