-- Add last_name_change field to track when display_name was last changed
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_name_change TIMESTAMPTZ DEFAULT NULL;

-- Add name_change_admin_override to track admin overrides
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS name_change_admin_override BOOLEAN DEFAULT FALSE;

-- Add website field if it doesn't exist yet (used in profile edit dialog)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS website TEXT DEFAULT NULL;

-- Constants table for storing application-wide settings
CREATE TABLE IF NOT EXISTS public.app_constants (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert admin override code
INSERT INTO public.app_constants (key, value, description)
VALUES ('admin_name_change_code', 'melodymaster2025', 'Admin code to override name change time restrictions')
ON CONFLICT (key) DO NOTHING;

-- Create function to check if user can change display name
CREATE OR REPLACE FUNCTION public.can_change_display_name(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  last_change TIMESTAMPTZ;
  admin_override BOOLEAN;
BEGIN
  -- Get the user's last name change and admin override status
  SELECT last_name_change, name_change_admin_override
  INTO last_change, admin_override
  FROM public.profiles
  WHERE id = user_id;
  
  -- If admin override is active, always allow
  IF admin_override THEN
    RETURN TRUE;
  END IF;
  
  -- If no previous change or it was more than 2 weeks ago, allow
  IF last_change IS NULL OR last_change < (now() - INTERVAL '2 weeks') THEN
    RETURN TRUE;
  END IF;
  
  -- Otherwise, don't allow
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.can_change_display_name IS 'Checks if a user can change their display name based on the 2-week rule';
