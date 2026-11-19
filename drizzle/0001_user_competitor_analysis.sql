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
-- Backfill from the pre-split layout, where competitors.metadata held one analysis shared by
-- every linked user. That analysis is only attributable when exactly one user is linked, so
-- only those users get a private row. Competitors with two or more linked users get none;
-- their users see no matches until discovery runs again for them. Rows that already exist,
-- and shared rows that hold no analysis fields, are left alone, so re-running is safe.
DO $$
DECLARE
  backfilled integer;
  ambiguous integer;
BEGIN
  INSERT INTO "sg_user_competitor_analysis" ("user_id", "competitor_id", "metadata", "created_at", "updated_at")
  SELECT
    uc."user_id",
    c."id",
    jsonb_build_object(
      'matchScore', CASE WHEN jsonb_typeof(c."metadata"->'matchScore') = 'number'
        THEN c."metadata"->'matchScore' ELSE '0'::jsonb END,
      'matchReasons', CASE WHEN jsonb_typeof(c."metadata"->'matchReasons') = 'array'
        THEN c."metadata"->'matchReasons' ELSE '[]'::jsonb END,
      'suggestedApproach', CASE WHEN jsonb_typeof(c."metadata"->'suggestedApproach') = 'string'
        THEN c."metadata"->'suggestedApproach' ELSE '""'::jsonb END,
      'dataGaps', CASE WHEN jsonb_typeof(c."metadata"->'dataGaps') = 'array'
        THEN c."metadata"->'dataGaps' ELSE '[]'::jsonb END,
      'lastAnalyzed', CASE WHEN jsonb_typeof(c."metadata"->'lastAnalyzed') = 'string'
        THEN c."metadata"->'lastAnalyzed' ELSE 'null'::jsonb END,
      'productMatches', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'productKey', COALESCE(NULLIF(BTRIM(p->>'url'), ''), BTRIM(COALESCE(p->>'name', ''))),
          'matchedProducts', CASE WHEN jsonb_typeof(p->'matchedProducts') = 'array'
            THEN p->'matchedProducts' ELSE '[]'::jsonb END
        )), '[]'::jsonb)
        FROM jsonb_array_elements(
          CASE WHEN jsonb_typeof(c."metadata"->'products') = 'array'
            THEN c."metadata"->'products' ELSE '[]'::jsonb END
        ) AS p
        WHERE jsonb_typeof(p) = 'object'
      )
    ),
    now(),
    now()
  FROM "sg_competitors" c
  JOIN "sg_user_competitors" uc ON uc."competitor_id" = c."id"
  WHERE c."metadata" ?| ARRAY['matchScore', 'matchReasons', 'suggestedApproach', 'dataGaps']
    AND (SELECT count(*) FROM "sg_user_competitors" n WHERE n."competitor_id" = c."id") = 1
  ON CONFLICT ("user_id", "competitor_id") DO NOTHING;
  GET DIAGNOSTICS backfilled = ROW_COUNT;

  SELECT count(*) INTO ambiguous
  FROM "sg_competitors" c
  WHERE c."metadata" ?| ARRAY['matchScore', 'matchReasons', 'suggestedApproach', 'dataGaps']
    AND (SELECT count(*) FROM "sg_user_competitors" n WHERE n."competitor_id" = c."id") > 1;

  RAISE NOTICE 'user_competitor_analysis backfill: % private rows copied, % shared competitors skipped (2+ linked users, analysis discarded)', backfilled, ambiguous;
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
