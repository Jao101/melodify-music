-- Enable public access to tracks that are marked as public
-- This allows the audio player to create signed URLs for public tracks

-- Create policy to allow reading storage objects for public tracks
CREATE OR REPLACE FUNCTION public.is_track_public(bucket_id text, object_path text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM tracks 
    WHERE is_public = true 
    AND (
      audio_url LIKE '%' || object_path || '%' 
      OR (metadata->>'storage_path')::text = object_path
    )
  );
$$;

-- Policy for storage.objects to allow reading public tracks
DO $$
BEGIN
    -- Drop existing policy if it exists
    DROP POLICY IF EXISTS "Allow reading public track files" ON storage.objects;
    
    -- Create new policy for public track access
    CREATE POLICY "Allow reading public track files" ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'user-songs' 
      AND public.is_track_public(bucket_id, name)
    );
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Policy already exists, ignore
END$$;

-- Also allow users to read their own files (maintain existing functionality)
DO $$
BEGIN
    -- Drop existing policy if it exists
    DROP POLICY IF EXISTS "Allow users to read own files" ON storage.objects;
    
    -- Create policy for own files
    CREATE POLICY "Allow users to read own files" ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'user-songs' 
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Policy already exists, ignore
END$$;
