-- Migration: enable pg_trgm extension and add trigram GIN indexes for fuzzy product search.
-- Applied via: prisma migrate deploy (on prod) or prisma migrate dev (local).
-- The GIN indexes on "Product".name and "Product".brand let PostgreSQL accelerate
-- similarity() and % (match) operators used in the two-phase fuzzy search.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS products_name_trgm ON products USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS products_brand_trgm ON products USING gin(brand gin_trgm_ops);
