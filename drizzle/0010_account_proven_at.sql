ALTER TABLE "sg_account" ADD COLUMN IF NOT EXISTS "proven_at" timestamp (3) with time zone;
