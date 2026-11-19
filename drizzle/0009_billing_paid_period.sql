CREATE TABLE IF NOT EXISTS "sg_billing_duplicate_refund" (
	"stripe_subscription_id" varchar(255) PRIMARY KEY NOT NULL,
	"stripe_customer_id" varchar(255) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"kept_subscription_id" varchar(255),
	"source_event_id" varchar(255),
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"refund_id" varchar(255),
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "sg_billing_subscription" ADD COLUMN IF NOT EXISTS "paid_period_start" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sg_billing_subscription" ADD COLUMN IF NOT EXISTS "paid_period_end" timestamp with time zone;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_billing_duplicate_refund_customer_status" ON "sg_billing_duplicate_refund" USING btree ("stripe_customer_id","status");--> statement-breakpoint
-- Active and trialing rows keep Pro: their current period was paid. past_due and canceled rows may hold an unpaid renewal period, so they stay NULL until Stripe's next event (or scripts/maintenance resync) re-reads the latest paid invoice.
UPDATE "sg_billing_subscription" SET "paid_period_start" = "current_period_start", "paid_period_end" = "current_period_end" WHERE "paid_period_end" IS NULL AND "status" IN ('active', 'trialing');
