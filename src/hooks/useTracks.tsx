import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';

export type Track = Tables<'tracks'>

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

      const { data, error: dbError } = await supabase
        .from('tracks')
        .select('*')
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;

      setTracks(data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
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