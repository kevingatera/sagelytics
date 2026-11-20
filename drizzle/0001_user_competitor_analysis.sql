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
CREATE INDEX IF NOT EXISTS "idx_uca_competitor" ON "sg_user_competitor_analysis" USING btree ("competitor_id");--> statement-breakpoint
-- The pre-split layout kept one analysis per competitor, shared by every linked user. The old
-- schema never recorded who wrote it, so no rule can prove which user it belongs to; copying it
-- to any user could show them someone else's analysis. Nobody gets a private row: users see
-- matches again after their next discovery. The old analysis is kept in sg_archive, outside
-- what Drizzle manages, so nothing is lost. Re-running is safe.
DO $$
DECLARE
  archived integer;
BEGIN
  CREATE SCHEMA IF NOT EXISTS sg_archive;
  CREATE TABLE IF NOT EXISTS sg_archive.sg_competitor_analysis_pre_split (
    "competitor_id" uuid PRIMARY KEY,
    "domain" text NOT NULL,
    "metadata" jsonb NOT NULL,
    "linked_user_ids" text[] NOT NULL,
    "archived_at" timestamp DEFAULT now() NOT NULL
  );
  INSERT INTO sg_archive.sg_competitor_analysis_pre_split ("competitor_id", "domain", "metadata", "linked_user_ids")
  SELECT c."id", c."domain", c."metadata",
    COALESCE((SELECT array_agg(uc."user_id" ORDER BY uc."user_id") FROM "sg_user_competitors" uc WHERE uc."competitor_id" = c."id"), '{}')
  FROM "sg_competitors" c
  WHERE c."metadata" ?| ARRAY['matchScore', 'matchReasons', 'suggestedApproach', 'dataGaps']
  ON CONFLICT ("competitor_id") DO NOTHING;
  GET DIAGNOSTICS archived = ROW_COUNT;
  RAISE NOTICE 'user_competitor_analysis: % shared analyses archived to sg_archive.sg_competitor_analysis_pre_split; no private rows copied', archived;
END $$;
--> statement-breakpoint
-- Keep only public facts on the shared row (CompetitorPublicMetadata): business name,
-- last analyzed time, listing platforms, and the competitor's own products without any
-- user's matches. A price that is missing or not positive becomes null (unknown).
UPDATE "sg_competitors" c
SET "metadata" = jsonb_strip_nulls(jsonb_build_object(
    'businessName', CASE WHEN jsonb_typeof(c."metadata"->'businessName') = 'string'
      THEN c."metadata"->'businessName' END,
    'lastAnalyzed', CASE WHEN jsonb_typeof(c."metadata"->'lastAnalyzed') = 'string'
      THEN c."metadata"->'lastAnalyzed' ELSE to_jsonb(to_char(c."updated_at", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) END
  )) || jsonb_build_object(
    'platforms', CASE WHEN jsonb_typeof(c."metadata"->'platforms') = 'array'
      THEN c."metadata"->'platforms' ELSE '[]'::jsonb END,
    'products', (
      SELECT COALESCE(jsonb_agg(
        (p - 'matchedProducts') || jsonb_build_object(
          'price', CASE WHEN jsonb_typeof(p->'price') = 'number' AND (p->>'price')::numeric > 0
            THEN p->'price' ELSE 'null'::jsonb END
        )
      ), '[]'::jsonb)
      FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(c."metadata"->'products') = 'array'
          THEN c."metadata"->'products' ELSE '[]'::jsonb END
      ) AS p
      WHERE jsonb_typeof(p) = 'object'
    )
  )
WHERE c."metadata" ?| ARRAY['matchScore', 'matchReasons', 'suggestedApproach', 'dataGaps']
  OR jsonb_typeof(c."metadata"->'products') IS DISTINCT FROM 'array'
  OR jsonb_typeof(c."metadata"->'platforms') IS DISTINCT FROM 'array'
  OR EXISTS (
    SELECT 1
    FROM jsonb_array_elements(
      CASE WHEN jsonb_typeof(c."metadata"->'products') = 'array'
        THEN c."metadata"->'products' ELSE '[]'::jsonb END
    ) AS p
    WHERE jsonb_typeof(p) <> 'object' OR p ? 'matchedProducts'
  );
