CREATE TABLE IF NOT EXISTS "sg_user_competitor_analysis" (
	"user_id" varchar(255) NOT NULL,
	"competitor_id" uuid NOT NULL,
	"metadata" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sg_user_competitor_analysis_user_id_competitor_id_pk" PRIMARY KEY("user_id","competitor_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sg_user_competitor_analysis" ADD CONSTRAINT "sg_user_competitor_analysis_user_id_sg_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."sg_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sg_user_competitor_analysis" ADD CONSTRAINT "sg_user_competitor_analysis_competitor_id_sg_competitors_id_fk" FOREIGN KEY ("competitor_id") REFERENCES "public"."sg_competitors"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_uca_competitor" ON "sg_user_competitor_analysis" USING btree ("competitor_id");

--> statement-breakpoint
-- Backfill: copy the analysis currently stored on each shared competitor row into a
-- row for every user linked to it. Shared public facts are left untouched, and existing
-- rows are kept (ON CONFLICT DO NOTHING), so re-running is safe.
INSERT INTO "sg_user_competitor_analysis" ("user_id", "competitor_id", "metadata", "created_at", "updated_at")
SELECT
  uc."user_id",
  c."id",
  jsonb_strip_nulls(jsonb_build_object(
    'matchScore', COALESCE(c."metadata"->'matchScore', '0'::jsonb),
    'matchReasons', COALESCE(c."metadata"->'matchReasons', '[]'::jsonb),
    'suggestedApproach', COALESCE(c."metadata"->'suggestedApproach', '""'::jsonb),
    'dataGaps', COALESCE(c."metadata"->'dataGaps', '[]'::jsonb),
    'lastAnalyzed', c."metadata"->'lastAnalyzed',
    'productMatches', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'productKey', COALESCE(NULLIF(BTRIM(p->>'url'), ''), BTRIM(p->>'name')),
        'matchedProducts', COALESCE(p->'matchedProducts', '[]'::jsonb)
      )), '[]'::jsonb)
      FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(c."metadata"->'products') = 'array'
          THEN c."metadata"->'products'
          ELSE '[]'::jsonb
        END
      ) AS p
    )
  )),
  now(),
  now()
FROM "sg_user_competitors" uc
JOIN "sg_competitors" c ON c."id" = uc."competitor_id"
ON CONFLICT ("user_id", "competitor_id") DO NOTHING;
