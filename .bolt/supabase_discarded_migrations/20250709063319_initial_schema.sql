-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'family')),
  subscription_end TIMESTAMPTZ,
  monthly_playtime_used INTEGER DEFAULT 0,
  monthly_songs_generated INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create tracks table for AI-generated songs
CREATE TABLE public.tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  duration INTEGER NOT NULL, -- duration in seconds
  genre TEXT,
  audio_url TEXT, -- URL to audio file in storage
  image_url TEXT, -- URL to cover art
  is_ai_generated BOOLEAN DEFAULT true,
  generated_by UUID REFERENCES public.profiles(id),
  lyrics TEXT,
  metadata JSONB, -- Additional metadata like BPM, key, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create playlists table
CREATE TABLE public.playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT false,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create playlist_tracks junction table
CREATE TABLE public.playlist_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(playlist_id, track_id),
  UNIQUE(playlist_id, position)
);

-- Create liked_tracks table
CREATE TABLE public.liked_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  liked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, track_id)
);

-- Create listening_history table
CREATE TABLE public.listening_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  listened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_listened INTEGER DEFAULT 0 -- seconds listened
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liked_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listening_history ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get current user profile
CREATE OR REPLACE FUNCTION public.get_current_user_profile()
RETURNS public.profiles AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Create RLS policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create RLS policies for tracks (all tracks viewable, only owners can modify AI-generated ones)
CREATE POLICY "All users can view tracks" ON public.tracks
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own AI tracks" ON public.tracks
  FOR INSERT WITH CHECK (auth.uid() = generated_by);

CREATE POLICY "Users can update their own AI tracks" ON public.tracks
  FOR UPDATE USING (auth.uid() = generated_by);

-- Create RLS policies for playlists
CREATE POLICY "Users can view public playlists and own playlists" ON public.playlists
  FOR SELECT USING (is_public = true OR auth.uid() = owner_id);

CREATE POLICY "Users can create own playlists" ON public.playlists
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own playlists" ON public.playlists
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own playlists" ON public.playlists
  FOR DELETE USING (auth.uid() = owner_id);

-- Create RLS policies for playlist_tracks
CREATE POLICY "Users can view playlist tracks for accessible playlists" ON public.playlist_tracks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.playlists 
      WHERE playlists.id = playlist_tracks.playlist_id 
      AND (playlists.is_public = true OR playlists.owner_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage tracks in own playlists" ON public.playlist_tracks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.playlists 
      WHERE playlists.id = playlist_tracks.playlist_id 
      AND playlists.owner_id = auth.uid()
    )
  );

-- Create RLS policies for liked_tracks
CREATE POLICY "Users can view own liked tracks" ON public.liked_tracks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own liked tracks" ON public.liked_tracks
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for listening_history
CREATE POLICY "Users can view own listening history" ON public.listening_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own listening history" ON public.listening_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create function to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tracks_updated_at
  BEFORE UPDATE ON public.tracks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_playlists_updated_at
  BEFORE UPDATE ON public.playlists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample AI tracks for demo
INSERT INTO public.tracks (title, artist, album, duration, genre, is_ai_generated, lyrics, metadata) VALUES
('Cosmic Journey', 'AI Composer', 'Digital Dreams', 240, 'Electronic', true, 'Floating through the endless night, stars guide my way...', '{"bpm": 128, "key": "C major", "mood": "uplifting"}'),
('Neon Nights', 'Synthwave AI', 'Retro Future', 195, 'Synthwave', true, 'City lights are calling me, neon dreams so bright...', '{"bpm": 110, "key": "A minor", "mood": "nostalgic"}'),
('Electric Dreams', 'Digital Harmony', 'AI Beats Vol. 1', 287, 'EDM', true, 'Electric currents through my mind, digital symphony...', '{"bpm": 140, "key": "F major", "mood": "energetic"}'),
('Midnight Groove', 'AI Jazz Collective', 'Smooth Algorithms', 210, 'Jazz', true, 'Saxophone whispers in the dark, midnight groove so deep...', '{"bpm": 90, "key": "B♭ major", "mood": "smooth"}'),
('Bass Drop Paradise', 'Electronic AI', 'Club Bangers', 180, 'Dubstep', true, 'Feel the bass drop, paradise found in the sound...', '{"bpm": 150, "key": "E minor", "mood": "intense"}');