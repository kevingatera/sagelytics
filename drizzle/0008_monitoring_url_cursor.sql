ALTER TABLE "sg_monitoring_tasks" ADD COLUMN IF NOT EXISTS "url_cursor" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Rows created by the old microservice path stored product_urls as a JSON string; unwrap them.
UPDATE "sg_monitoring_tasks" SET "product_urls" = ("product_urls" #>> '{}')::jsonb WHERE jsonb_typeof("product_urls") = 'string';
