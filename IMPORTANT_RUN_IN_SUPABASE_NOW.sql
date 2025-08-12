-- ========================================
-- SOFORT IN SUPABASE DASHBOARD AUSFÜHREN!
-- Dashboard > SQL Editor > Neue Query
-- ========================================

-- 1. Prüfe aktuelle Struktur der tracks Tabelle
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'tracks' 
ORDER BY ordinal_position;

-- 2. Füge is_public Feld hinzu falls es nicht existiert
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

-- 3. Prüfe ob user_id Feld existiert, falls nicht von generated_by migrieren
DO $$ 
BEGIN
    -- Falls user_id nicht existiert, füge es hinzu
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tracks' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.tracks ADD COLUMN user_id UUID;
        
        -- Setze user_id = generated_by wo möglich
        UPDATE public.tracks 
        SET user_id = generated_by 
        WHERE generated_by IS NOT NULL AND user_id IS NULL;
        
        -- Füge Foreign Key Constraint hinzu
        ALTER TABLE public.tracks 
        ADD CONSTRAINT fk_tracks_user_id 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
    
    -- Falls user_id existiert aber NULL ist, von generated_by kopieren
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tracks' AND column_name = 'user_id'
    ) THEN
        UPDATE public.tracks 
        SET user_id = generated_by 
        WHERE generated_by IS NOT NULL AND user_id IS NULL;
    END IF;
END $$;

-- 4. Lösche alte RLS Policies
DROP POLICY IF EXISTS "Anyone can view tracks" ON public.tracks;
DROP POLICY IF EXISTS "Users can view public tracks and own tracks" ON public.tracks;
DROP POLICY IF EXISTS "Users can insert own tracks" ON public.tracks;
DROP POLICY IF EXISTS "Users can update own tracks" ON public.tracks;
DROP POLICY IF EXISTS "Users can delete own tracks" ON public.tracks;

-- 5. Erstelle neue RLS Policies für Public Tracks
CREATE POLICY "Users can view public tracks and own tracks" ON public.tracks
    FOR SELECT USING (
        is_public = true 
        OR user_id = auth.uid()
        OR generated_by = auth.uid()
    );

CREATE POLICY "Users can insert own tracks" ON public.tracks
    FOR INSERT WITH CHECK (
        user_id = auth.uid() 
        OR generated_by = auth.uid()
    );

CREATE POLICY "Users can update own tracks" ON public.tracks
    FOR UPDATE USING (
        user_id = auth.uid() 
        OR generated_by = auth.uid()
    );

CREATE POLICY "Users can delete own tracks" ON public.tracks
    FOR DELETE USING (
        user_id = auth.uid() 
        OR generated_by = auth.uid()
    );

-- 6. Erstelle Performance-Indexes
CREATE INDEX IF NOT EXISTS idx_tracks_is_public ON public.tracks(is_public);
CREATE INDEX IF NOT EXISTS idx_tracks_user_id ON public.tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_tracks_public_created ON public.tracks(is_public, created_at DESC) WHERE is_public = true;

-- 7. Prüfe das Ergebnis
SELECT 
    id, 
    title, 
    user_id, 
    generated_by, 
    is_public,
    created_at
FROM public.tracks 
ORDER BY created_at DESC 
LIMIT 5;

-- ========================================
-- FERTIG! Jetzt sollten alle Tracks korrekt verknüpft sein
-- ========================================
