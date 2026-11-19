-- sg_post was the create-t3-app example table. Main exposed it only through the unused
-- post tRPC router; this schema no longer defines it. An empty table is dropped. A table
-- with rows is kept: it moves to the sg_archive schema, outside what Drizzle manages, and
-- loses its user foreign key so it cannot block user deletion. Drop it there by hand once
-- the rows are no longer needed: DROP TABLE sg_archive.sg_post;
DO $$
DECLARE
  post_rows bigint;
BEGIN
  IF to_regclass('public.sg_post') IS NULL THEN
    RETURN;
  END IF;

  EXECUTE 'SELECT count(*) FROM public.sg_post' INTO post_rows;
  IF post_rows = 0 THEN
    DROP TABLE public.sg_post;
    RAISE NOTICE 'sg_post was empty and has been dropped';
  ELSE
    CREATE SCHEMA IF NOT EXISTS sg_archive;
    IF to_regclass('sg_archive.sg_post') IS NOT NULL THEN
      RAISE EXCEPTION 'sg_post has % rows and sg_archive.sg_post already exists; resolve by hand', post_rows;
    END IF;
    ALTER TABLE public.sg_post DROP CONSTRAINT IF EXISTS sg_post_created_by_sg_user_id_fk;
    ALTER TABLE public.sg_post SET SCHEMA sg_archive;
    RAISE NOTICE 'sg_post has % rows and was moved to sg_archive.sg_post', post_rows;
  END IF;
END $$;
