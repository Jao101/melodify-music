-- Ensure each user has unique Nextcloud path per track to prevent duplicates
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'tracks_unique_nextcloud_path_per_user'
  ) THEN
    CREATE UNIQUE INDEX tracks_unique_nextcloud_path_per_user
      ON public.tracks ((metadata->>'nextcloud_path'), generated_by)
      WHERE (metadata->>'nextcloud_path') IS NOT NULL;
  END IF;
END $$;
