import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  genre: string | null;
  duration: number;
  audio_url: string | null;
  image_url: string | null;
  lyrics: string | null;
  is_ai_generated: boolean;
  generated_by: string | null;
  created_at: string;
  updated_at: string;
  metadata: any;
}

export function useTracks() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchTracks();
  }, [user]);

  const fetchTracks = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTracks(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching tracks:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    tracks,
    loading,
    error,
    refetch: fetchTracks
  };
}