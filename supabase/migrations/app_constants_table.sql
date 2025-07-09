-- Create constants table for storing application-wide settings if it doesn't exist
CREATE TABLE IF NOT EXISTS public.app_constants (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert admin override code if it doesn't exist
INSERT INTO public.app_constants (key, value, description)
VALUES ('admin_name_change_code', 'melodymaster2025', 'Admin code to override name change time restrictions')
ON CONFLICT (key) DO NOTHING;
