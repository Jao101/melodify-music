import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Track } from './useTracks';

export function useUserTracks() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(75);

  const fetchUserTracks = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);

      const { data, error: dbError } = await supabase
        .from('tracks')
        .select('*')
        .eq('generated_by', user.id)
        .eq('user_uploaded', true)
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;

      setTracks(data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      console.error('Error fetching user tracks:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchUserTracks();
    }
  }, [user, fetchUserTracks]);

  const playTrack = (track: Track) => {
    setCurrentTrack(track);
    setIsPlaying(true);
    setCurrentTime(0);
  };

  const pauseTrack = () => {
    setIsPlaying(false);
  };

  const playPause = () => {
    setIsPlaying(!isPlaying);
  };

  const nextTrack = () => {
    if (!currentTrack) return;
    const currentIndex = tracks.findIndex(t => t.id === currentTrack.id);
    const nextTrack = tracks[currentIndex + 1];
    if (nextTrack) {
      playTrack(nextTrack);
    }
  };

  const previousTrack = () => {
    if (!currentTrack) return;
    const currentIndex = tracks.findIndex(t => t.id === currentTrack.id);
    const prevTrack = tracks[currentIndex - 1];
    if (prevTrack) {
      playTrack(prevTrack);
    }
  };

  const seekTo = (time: number) => {
    setCurrentTime(time);
  };

  const setVolumeLevel = (vol: number) => {
    setVolume(vol);
  };

  return {
    tracks,
    loading,
    error,
    currentTrack,
    isPlaying,
    currentTime,
    volume,
    playTrack,
    pauseTrack,
    playPause,
    nextTrack,
    previousTrack,
    seekTo,
    setVolumeLevel,
    refetch: fetchUserTracks
  };
}