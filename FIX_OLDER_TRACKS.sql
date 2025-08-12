-- WICHTIG: Führe das in deinem Supabase Dashboard aus!
-- Dashboard > SQL Editor > Neue Query

-- 1. Repariere ältere Tracks: setze user_id = generated_by wo user_id NULL ist
UPDATE public.tracks 
SET user_id = generated_by 
WHERE user_id IS NULL AND generated_by IS NOT NULL;

-- 2. Prüfe das Ergebnis
SELECT 
    id, 
    title, 
    user_id, 
    generated_by, 
    is_public,
    created_at
FROM public.tracks 
WHERE is_public = true
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Zeige Profile-Informationen für öffentliche Tracks
SELECT 
    t.id,
    t.title,
    t.user_id,
    t.generated_by,
    t.is_public,
    p1.display_name as user_profile_name,
    p2.display_name as generator_profile_name
FROM public.tracks t
LEFT JOIN public.profiles p1 ON t.user_id = p1.id
LEFT JOIN public.profiles p2 ON t.generated_by = p2.id
WHERE t.is_public = true
ORDER BY t.created_at DESC;

-- FERTIG! Nach diesem Update sollten:
-- 1. Alle Tracks korrekte user_id Verknüpfungen haben
-- 2. "Make Private" Button bei allen eigenen Tracks angezeigt werden
-- 3. Uploader-Namen korrekt angezeigt werden
