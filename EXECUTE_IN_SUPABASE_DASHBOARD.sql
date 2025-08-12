-- ========================================
-- WICHTIG: Führe dieses SQL in deinem Supabase Dashboard aus!
-- Gehe zu: Supabase Dashboard > Dein Projekt > SQL Editor > Neue Query
-- Kopiere und führe dieses SQL aus
-- ========================================

-- 4. Public Tracks Functionality
-- Ensure tracks table has all necessary fields for public sharing

-- First, let's make sure the tracks table has user_id field
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tracks' 
        AND column_name = 'user_id'
    ) THEN
        -- Add user_id if it doesn't exist
        ALTER TABLE public.tracks ADD COLUMN user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
        
        -- Migrate data from generated_by to user_id if generated_by exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'tracks' 
            AND column_name = 'generated_by'
        ) THEN
            UPDATE public.tracks SET user_id = generated_by WHERE user_id IS NULL;
        END IF;
    END IF;
END $$;

-- Ensure is_public field exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tracks' 
        AND column_name = 'is_public'
    ) THEN
        ALTER TABLE public.tracks ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Update RLS policies for public tracks functionality
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view tracks" ON public.tracks;
DROP POLICY IF EXISTS "Users can view public tracks and own tracks" ON public.tracks;
DROP POLICY IF EXISTS "Users can insert own tracks" ON public.tracks;
DROP POLICY IF EXISTS "Users can update own tracks" ON public.tracks;
DROP POLICY IF EXISTS "Users can delete own tracks" ON public.tracks;

-- Create new comprehensive policies
-- Policy 1: View access - users can see public tracks and their own tracks
CREATE POLICY "Users can view public tracks and own tracks" ON public.tracks
    FOR SELECT USING (
        is_public = true 
        OR user_id = auth.uid()
        OR generated_by = auth.uid()
    );

-- Policy 2: Insert access - users can only insert their own tracks
CREATE POLICY "Users can insert own tracks" ON public.tracks
    FOR INSERT WITH CHECK (
        user_id = auth.uid() 
        OR generated_by = auth.uid()
    );

-- Policy 3: Update access - users can only update their own tracks
CREATE POLICY "Users can update own tracks" ON public.tracks
    FOR UPDATE USING (
        user_id = auth.uid() 
        OR generated_by = auth.uid()
    );

-- Policy 4: Delete access - users can only delete their own tracks
CREATE POLICY "Users can delete own tracks" ON public.tracks
    FOR DELETE USING (
        user_id = auth.uid() 
        OR generated_by = auth.uid()
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tracks_is_public ON public.tracks(is_public);
CREATE INDEX IF NOT EXISTS idx_tracks_user_id ON public.tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_tracks_public_created ON public.tracks(is_public, created_at DESC) WHERE is_public = true;

-- Add comment for documentation
COMMENT ON COLUMN public.tracks.is_public IS 'When true, track is visible to all users. When false, only visible to the owner.';

-- ========================================
-- FERTIG! 
-- Nach der Ausführung kannst du:
-- 1. Songs hochladen (standardmäßig privat)
-- 2. In "Meine Uploads" mit 🔒/🌍 Button öffentlich machen  
-- 3. In "Öffentliche Songs" alle geteilten Songs sehen
-- 4. Nur eigene Songs löschen/verwalten
-- ========================================
