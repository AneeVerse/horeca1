-- Embedding columns for AI-assisted brand mapping (Phase 3).
-- Float[] (double precision[]) so we can store vectors of any dimension
-- without an extension. Cosine sim is computed in JS at mapping time.

ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "embedding" double precision[] NOT NULL DEFAULT ARRAY[]::double precision[],
  ADD COLUMN IF NOT EXISTS "embedding_model" VARCHAR(80),
  ADD COLUMN IF NOT EXISTS "embedding_updated_at" TIMESTAMPTZ;

ALTER TABLE "brand_master_products"
  ADD COLUMN IF NOT EXISTS "embedding" double precision[] NOT NULL DEFAULT ARRAY[]::double precision[],
  ADD COLUMN IF NOT EXISTS "embedding_model" VARCHAR(80),
  ADD COLUMN IF NOT EXISTS "embedding_updated_at" TIMESTAMPTZ;
