-- Zoho-style customer/vendor parity fields on BusinessAccount + a ContactPerson
-- table (multiple contacts per account). Idempotent so it can run on the live
-- DB (which may already have some columns via db push) and fresh environments.

ALTER TABLE "business_accounts"
  ADD COLUMN IF NOT EXISTS "customer_type"     VARCHAR(20)  NOT NULL DEFAULT 'business',
  ADD COLUMN IF NOT EXISTS "salutation"        VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "first_name"        VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "last_name"         VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "company_name"      VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "customer_language" VARCHAR(20)  NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS "tax_preference"    VARCHAR(20)  NOT NULL DEFAULT 'taxable',
  ADD COLUMN IF NOT EXISTS "gst_treatment"     VARCHAR(40),
  ADD COLUMN IF NOT EXISTS "place_of_supply"   VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "currency"          VARCHAR(10)  NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS "credit_limit"      DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "payment_terms"     VARCHAR(40),
  ADD COLUMN IF NOT EXISTS "enable_portal"     BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "work_phone"        VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "mobile_phone"      VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "remarks"           TEXT,
  ADD COLUMN IF NOT EXISTS "custom_fields"     JSONB        NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS "contact_persons" (
  "id"                  UUID         NOT NULL DEFAULT gen_random_uuid(),
  "business_account_id" UUID         NOT NULL,
  "salutation"          VARCHAR(20),
  "first_name"          VARCHAR(120),
  "last_name"           VARCHAR(120),
  "email"               VARCHAR(255),
  "work_phone"          VARCHAR(20),
  "mobile"              VARCHAR(20),
  "designation"         VARCHAR(120),
  "is_primary"          BOOLEAN      NOT NULL DEFAULT false,
  "created_at"          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT "contact_persons_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "contact_persons_business_account_id_fkey"
    FOREIGN KEY ("business_account_id") REFERENCES "business_accounts"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "contact_persons_business_account_id_idx"
  ON "contact_persons"("business_account_id");
