-- ========================================
-- MIGRATION: Add Settings Tables
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

-- ========================================
-- MIGRATION COMPLETE
-- The following tables have been created:
-- - notification_settings
-- - app_settings
-- Both tables include RLS policies and proper indexing
-- ========================================
