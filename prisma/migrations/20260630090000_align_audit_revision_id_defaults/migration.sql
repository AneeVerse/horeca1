-- Align id columns with schema.prisma's @default(uuid()) (Prisma generates the UUID
-- client-side, so there is NO database default). The product_audit_logs /
-- master_product_revisions tables were created (migration 20260629180000) with a
-- hand-written DEFAULT gen_random_uuid(), which made a fresh-DB build drift from the
-- schema. Drop the defaults so migrations reproduce schema.prisma exactly.
-- Safe: Prisma always supplies the id on insert; on prod (db push) the column never
-- had a default, so DROP DEFAULT is a no-op there.

ALTER TABLE "product_audit_logs" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "master_product_revisions" ALTER COLUMN "id" DROP DEFAULT;
