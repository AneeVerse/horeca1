-- Phase 4.2: hyper-personalization profile skip/complete later
-- Track whether the user has completed the optional personalization profile.
ALTER TABLE "users" ADD COLUMN "profile_completed_at" TIMESTAMPTZ;
