-- Create app_settings table
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

-- Create unique index on user_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_settings_user_id ON public.app_settings(user_id);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own app settings" ON public.app_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own app settings" ON public.app_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own app settings" ON public.app_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own app settings" ON public.app_settings
    FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_app_settings_updated_at
    BEFORE UPDATE ON public.app_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
