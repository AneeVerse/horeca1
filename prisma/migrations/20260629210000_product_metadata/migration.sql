-- Product + MasterProduct `metadata` JSON column. Stores the Vendor_Item_Template
-- Zoho/accounting fields that have no dedicated column (accounting, inventory,
-- packaging, identifiers, attributes) under one nested JSON object. Non-destructive,
-- nullable with a {} default. Mirrors the schema's `metadata Json? @default("{}")`.

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}';
ALTER TABLE "master_products" ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}';
