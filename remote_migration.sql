-- ========================================
-- MIGRATION: Add Settings Tables & Public Tracks
-- Execute this SQL in your Supabase Dashboard > SQL Editor
-- ========================================

-- 1. Create notification_settings table
CREATE TABLE IF NOT EXISTS public.notification_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    marketing_emails BOOLEAN DEFAULT false,
    new_music_alerts BOOLEAN DEFAULT true,
    playlist_updates BOOLEAN DEFAULT true,
    social_interactions BOOLEAN DEFAULT true,
    system_updates BOOLEAN DEFAULT true,
    sound_enabled BOOLEAN DEFAULT true,
    notification_frequency TEXT DEFAULT 'realtime' CHECK (notification_frequency IN ('realtime', 'daily', 'weekly')),
    quiet_hours_enabled BOOLEAN DEFAULT false,
    quiet_hours_start TEXT DEFAULT '22:00',
    quiet_hours_end TEXT DEFAULT '08:00',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index on user_id for notification_settings
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_settings_user_id ON public.notification_settings(user_id);

-- Enable RLS for notification_settings
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notification_settings
CREATE POLICY "Users can view their own notification settings" ON public.notification_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings" ON public.notification_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings" ON public.notification_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification settings" ON public.notification_settings
    FOR DELETE USING (auth.uid() = user_id);

-- 2. Create app_settings table
CREATE TABLE IF NOT EXISTS public.app_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Appearance settings
    theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    language TEXT DEFAULT 'en',
    
    -- Audio settings
    audio_quality TEXT DEFAULT 'high' CHECK (audio_quality IN ('low', 'medium', 'high', 'lossless')),
    auto_play BOOLEAN DEFAULT true,
    crossfade_enabled BOOLEAN DEFAULT false,
    crossfade_duration INTEGER DEFAULT 5 CHECK (crossfade_duration BETWEEN 1 AND 12),
    volume_normalization BOOLEAN DEFAULT true,
    
    -- Storage & Data settings
    download_quality TEXT DEFAULT 'high' CHECK (download_quality IN ('low', 'medium', 'high')),
    offline_mode BOOLEAN DEFAULT false,
    data_saver BOOLEAN DEFAULT false,
    cache_size_mb INTEGER DEFAULT 500 CHECK (cache_size_mb BETWEEN 100 AND 2000),
    
    -- Privacy settings
    analytics_enabled BOOLEAN DEFAULT true,
    crash_reporting BOOLEAN DEFAULT true,
    profile_visibility BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    marketing_notifications BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index on user_id for app_settings
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_settings_user_id ON public.app_settings(user_id);

-- Enable RLS for app_settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for app_settings
CREATE POLICY "Users can view their own app settings" ON public.app_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own app settings" ON public.app_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own app settings" ON public.app_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own app settings" ON public.app_settings
    FOR DELETE USING (auth.uid() = user_id);

-- 3. Create triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notification_settings_updated_at
    BEFORE UPDATE ON public.notification_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_settings_updated_at
    BEFORE UPDATE ON public.app_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
-- MIGRATION COMPLETE
-- The following has been created/updated:
-- - notification_settings table
-- - app_settings table  
-- - tracks table with is_public functionality
-- - All tables include RLS policies and proper indexing
-- ========================================
