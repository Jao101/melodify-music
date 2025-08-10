-- Add volume to playback_state for cross-device sync
ALTER TABLE public.playback_state
  ADD COLUMN IF NOT EXISTS volume INTEGER NOT NULL DEFAULT 50 CHECK (volume >= 0 AND volume <= 100);

-- Touch updated_at when volume changes (clients should set updated_at, but ensure it's not stale)
CREATE OR REPLACE FUNCTION public.set_playback_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_playback_state_updated_at ON public.playback_state;
CREATE TRIGGER trg_playback_state_updated_at
BEFORE UPDATE ON public.playback_state
FOR EACH ROW
EXECUTE FUNCTION public.set_playback_state_updated_at();
