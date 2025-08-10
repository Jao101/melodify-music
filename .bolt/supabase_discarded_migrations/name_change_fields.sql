-- Add last_name_change field to track when display_name was last changed
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_name_change TIMESTAMPTZ DEFAULT NULL;

-- Add name_change_admin_override to track admin overrides
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS name_change_admin_override BOOLEAN DEFAULT FALSE;

-- Add website field if it doesn't exist yet (used in profile edit dialog)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS website TEXT DEFAULT NULL;
