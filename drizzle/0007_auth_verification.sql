-- Existing users signed up when every account was treated as verified; keep them able to sign in.
-- This runs before the default is dropped, so it only touches accounts created before this migration.
UPDATE "sg_user" SET "email_verified" = now() WHERE "email_verified" IS NULL;--> statement-breakpoint
ALTER TABLE "sg_user" ALTER COLUMN "email_verified" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sg_user" ADD COLUMN IF NOT EXISTS "session_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_email_lower_idx" ON "sg_user" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "verification_token_token_idx" ON "sg_verification_token" USING btree ("token");--> statement-breakpoint
-- Reset tokens from before this change are raw UUIDs keyed by the bare email and no longer validate.
DELETE FROM "sg_verification_token" WHERE "identifier" NOT LIKE 'verify:%' AND "identifier" NOT LIKE 'reset:%';
