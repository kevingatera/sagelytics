ALTER TABLE "sg_billing_subscription" ADD COLUMN IF NOT EXISTS "checkout_session_id" varchar(255);--> statement-breakpoint
ALTER TABLE "sg_billing_subscription" ADD COLUMN IF NOT EXISTS "checkout_session_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sg_billing_subscription" ADD COLUMN IF NOT EXISTS "checkout_attempt" integer DEFAULT 0 NOT NULL;