-- Create storage buckets for user uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('user-songs', 'user-songs', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('song-covers', 'song-covers', true);

-- Create storage policies for user songs (private)
CREATE POLICY "Users can view their own songs" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'user-songs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own songs" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'user-songs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own songs" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'user-songs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own songs" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'user-songs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage policies for song covers (public, but user-controlled)
CREATE POLICY "Anyone can view song covers" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'song-covers');

CREATE POLICY "Users can upload their own song covers" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'song-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own song covers" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'song-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own song covers" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'song-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add user_uploaded column to tracks table to distinguish user uploads
ALTER TABLE tracks ADD COLUMN user_uploaded boolean DEFAULT false;

-- Update RLS policies for tracks to allow users to manage their own uploads
CREATE POLICY "Users can insert their own uploaded tracks" 
ON tracks 
FOR INSERT 
WITH CHECK (auth.uid() = generated_by AND user_uploaded = true);

CREATE POLICY "Users can update their own uploaded tracks" 
ON tracks 
FOR UPDATE 
USING (auth.uid() = generated_by AND user_uploaded = true);

CREATE POLICY "Users can delete their own uploaded tracks" 
ON tracks 
FOR DELETE 
USING (auth.uid() = generated_by AND user_uploaded = true);