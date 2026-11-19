ALTER TABLE "sg_user" ADD COLUMN IF NOT EXISTS "session_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Every account that exists here predates email verification. The old column default stamped
-- email_verified on each one, and the old settings page let users change their email freely, so
-- neither the stamp nor an OAuth link proves the stored address. Clear it for everyone and end
-- every existing session (tokens without a version count as 0). Password users confirm through a
-- resent link; Google users are marked verified on their next sign-in when Google's verified
-- address matches the stored one.
UPDATE "sg_user" SET "email_verified" = NULL, "session_version" = "session_version" + 1;--> statement-breakpoint
ALTER TABLE "sg_user" ALTER COLUMN "email_verified" DROP DEFAULT;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_email_lower_idx" ON "sg_user" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "verification_token_token_idx" ON "sg_verification_token" USING btree ("token");--> statement-breakpoint
-- Reset tokens from before this change are raw UUIDs keyed by the bare email and no longer validate.
DELETE FROM "sg_verification_token" WHERE "identifier" NOT LIKE 'verify:%' AND "identifier" NOT LIKE 'reset:%';
