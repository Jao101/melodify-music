-- Persist playback queue order for cross-device shuffle continuity
ALTER TABLE public.playback_state
  ADD COLUMN IF NOT EXISTS queue_ids uuid[] NOT NULL DEFAULT '{}';
