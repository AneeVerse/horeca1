-- Add nullable role_id FK on the three team-member tables so they can point at
-- a Role row in the new JSON-permissions engine. Legacy `role` enum column is
-- kept for one release as a fallback; it is dropped in a follow-up migration
-- once every member has been backfilled and the application no longer reads it.

ALTER TABLE "vendor_team_members" ADD COLUMN "role_id" UUID;
ALTER TABLE "brand_team_members"  ADD COLUMN "role_id" UUID;
ALTER TABLE "admin_team_members"  ADD COLUMN "role_id" UUID;

ALTER TABLE "vendor_team_members"
  ADD CONSTRAINT "vendor_team_members_role_id_fkey"
  FOREIGN KEY ("role_id") REFERENCES "account_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "brand_team_members"
  ADD CONSTRAINT "brand_team_members_role_id_fkey"
  FOREIGN KEY ("role_id") REFERENCES "account_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "admin_team_members"
  ADD CONSTRAINT "admin_team_members_role_id_fkey"
  FOREIGN KEY ("role_id") REFERENCES "account_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "vendor_team_members_role_id_idx" ON "vendor_team_members"("role_id");
CREATE INDEX "brand_team_members_role_id_idx"  ON "brand_team_members"("role_id");
CREATE INDEX "admin_team_members_role_id_idx"  ON "admin_team_members"("role_id");
