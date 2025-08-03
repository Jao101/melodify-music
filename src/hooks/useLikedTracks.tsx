import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Track } from './useTracks';

export interface LikedTrack {
  id: string;
  track_id: string;
  user_id: string;
  liked_at: string;
  track: Track;
}

export function useLikedTracks() {
  const [likedTracks, setLikedTracks] = useState<LikedTrack[]>([]);
  const [likedTrackIds, setLikedTrackIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchLikedTracks();
    } else {
      setLikedTracks([]);
      setLikedTrackIds(new Set());
      setLoading(false);
    }
  }, [user]);

  const fetchLikedTracks = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('liked_tracks')
        .select(`
          *,
          track:tracks(*)
        `)
        .eq('user_id', user.id)
        .order('liked_at', { ascending: false });

      if (error) throw error;

      const tracks = data || [];
      setLikedTracks(tracks);
      setLikedTrackIds(new Set(tracks.map(lt => lt.track_id)));
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching liked tracks:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleLike = async (trackId: string) => {
    if (!user) return;

    try {
      const isLiked = likedTrackIds.has(trackId);

      if (isLiked) {
        // Unlike the track
        const { error } = await supabase
          .from('liked_tracks')
          .delete()
          .eq('user_id', user.id)
          .eq('track_id', trackId);

        if (error) throw error;

        setLikedTracks(prev => prev.filter(lt => lt.track_id !== trackId));
        setLikedTrackIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(trackId);
          return newSet;
        });
      } else {
        // Like the track
        const { data, error } = await supabase
          .from('liked_tracks')
          .insert({
            user_id: user.id,
            track_id: trackId
          })
          .select(`
            *,
            track:tracks(*)
          `)
          .single();

        if (error) throw error;

        if (data) {
          setLikedTracks(prev => [data, ...prev]);
          setLikedTrackIds(prev => new Set([...prev, trackId]));
        }
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error toggling like:', err);
    }
  };

  const isLiked = (trackId: string) => likedTrackIds.has(trackId);

  return {
    likedTracks,
    loading,
    error,
    toggleLike,
    isLiked,
    refetch: fetchLikedTracks
  };
}