CREATE TABLE IF NOT EXISTS "sg_monitoring_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"monitoring_task_id" uuid,
	"alert_type" varchar(50) NOT NULL,
	"threshold_value" numeric(10, 2),
	"threshold_type" varchar(20),
	"enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sg_monitoring_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"competitor_domain" text NOT NULL,
	"product_urls" jsonb NOT NULL,
	"frequency" varchar(50) NOT NULL,
	"enabled" boolean DEFAULT true,
	"last_run" timestamp,
	"next_run" timestamp,
	"status" varchar(20) DEFAULT 'active',
	"discovery_source" varchar(20) DEFAULT 'perplexity',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sg_notification_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"alert_id" uuid,
	"notification_type" varchar(20) NOT NULL,
	"recipient" text NOT NULL,
	"subject" text,
	"content" text,
	"status" varchar(20) DEFAULT 'pending',
	"sent_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sg_price_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"monitoring_task_id" uuid NOT NULL,
	"product_name" text NOT NULL,
	"product_url" text NOT NULL,
	"price" numeric(10, 2),
	"currency" varchar(3),
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"change_percentage" numeric(5, 2),
	"previous_price" numeric(10, 2),
	"extraction_method" varchar(20) DEFAULT 'direct_crawl'
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sg_user_notification_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"enable_price_alerts" boolean DEFAULT true,
	"enable_competitor_updates" boolean DEFAULT true,
	"enable_market_insights" boolean DEFAULT true,
	"enable_billing_updates" boolean DEFAULT true,
	"schedule" varchar(20) DEFAULT 'instant',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sg_user_notification_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sg_user_products" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"sku" varchar(255) NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"category" varchar(100) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uc_user_sku" UNIQUE("user_id","sku")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sg_monitoring_alerts" ADD CONSTRAINT "sg_monitoring_alerts_user_id_sg_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."sg_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sg_monitoring_alerts" ADD CONSTRAINT "sg_monitoring_alerts_monitoring_task_id_sg_monitoring_tasks_id_" FOREIGN KEY ("monitoring_task_id") REFERENCES "public"."sg_monitoring_tasks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sg_monitoring_tasks" ADD CONSTRAINT "sg_monitoring_tasks_user_id_sg_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."sg_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sg_notification_logs" ADD CONSTRAINT "sg_notification_logs_user_id_sg_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."sg_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sg_notification_logs" ADD CONSTRAINT "sg_notification_logs_alert_id_sg_monitoring_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."sg_monitoring_alerts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sg_price_history" ADD CONSTRAINT "sg_price_history_monitoring_task_id_sg_monitoring_tasks_id_fk" FOREIGN KEY ("monitoring_task_id") REFERENCES "public"."sg_monitoring_tasks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sg_user_notification_settings" ADD CONSTRAINT "sg_user_notification_settings_user_id_sg_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."sg_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sg_user_products" ADD CONSTRAINT "sg_user_products_user_id_sg_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."sg_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_monitoring_alerts_user" ON "sg_monitoring_alerts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_monitoring_alerts_task" ON "sg_monitoring_alerts" USING btree ("monitoring_task_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_monitoring_alerts_enabled" ON "sg_monitoring_alerts" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_monitoring_tasks_user" ON "sg_monitoring_tasks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_monitoring_tasks_status" ON "sg_monitoring_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_monitoring_tasks_enabled" ON "sg_monitoring_tasks" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_monitoring_tasks_next_run" ON "sg_monitoring_tasks" USING btree ("next_run");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notification_logs_user" ON "sg_notification_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notification_logs_status" ON "sg_notification_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notification_logs_created_at" ON "sg_notification_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_price_history_task" ON "sg_price_history" USING btree ("monitoring_task_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_price_history_recorded_at" ON "sg_price_history" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_price_history_product_url" ON "sg_price_history" USING btree ("product_url");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_notification_settings_user" ON "sg_user_notification_settings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_products_user" ON "sg_user_products" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_products_sku" ON "sg_user_products" USING btree ("sku");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_products_name" ON "sg_user_products" USING btree ("name");