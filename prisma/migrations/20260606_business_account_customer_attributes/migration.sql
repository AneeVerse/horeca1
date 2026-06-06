-- Customer master-datasheet attributes on business_accounts (P0-4).
-- All additive + nullable / defaulted => safe to apply on a populated table.

ALTER TABLE "business_accounts"
  ADD COLUMN "sub_type"               VARCHAR(80),
  ADD COLUMN "cuisine"                VARCHAR(120),
  ADD COLUMN "business_size"          VARCHAR(50),
  ADD COLUMN "business_structure"     VARCHAR(50),
  ADD COLUMN "service_model"          VARCHAR(120),
  ADD COLUMN "monthly_purchase_band"  VARCHAR(50),
  ADD COLUMN "procurement_frequency"  VARCHAR(50),
  ADD COLUMN "designation"            VARCHAR(120),
  ADD COLUMN "lead_status"            VARCHAR(50),
  ADD COLUMN "credit_type"            VARCHAR(50),
  ADD COLUMN "manual_tags"            TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "ai_tags"                TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "behaviour_tags"         TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
