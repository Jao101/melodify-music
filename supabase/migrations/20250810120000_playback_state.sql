-- Playback state per user for cross-device resume
CREATE TABLE IF NOT EXISTS public.playback_state (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  track_id UUID REFERENCES public.tracks(id),
  position INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.playback_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own playback state" ON public.playback_state
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own playback state" ON public.playback_state
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own playback state" ON public.playback_state
  FOR UPDATE USING (auth.uid() = user_id);
