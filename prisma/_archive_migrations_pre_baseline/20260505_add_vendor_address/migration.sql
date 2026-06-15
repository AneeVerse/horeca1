-- Add vendor business address fields for tax-invoice "Bill From / Shipped From".
ALTER TABLE "vendors"
  ADD COLUMN IF NOT EXISTS "address_line"     TEXT,
  ADD COLUMN IF NOT EXISTS "city"             VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "state"            VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "address_pincode"  VARCHAR(10),
  ADD COLUMN IF NOT EXISTS "gst_number"       VARCHAR(20);
