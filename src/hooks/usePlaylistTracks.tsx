import { useState, useEffect } from "react";
import { addTrackToPlaylist, removeTrackFromPlaylist } from "@/services/playlistService";
import { supabase } from "@/integrations/supabase/client";

export type PlaylistTrack = {
  id: string;
  position: number;
  added_at: string;
  track: {
    id: string;
    title: string;
    artist: string;
    album: string | null;
    duration: number;
    audio_url: string | null;
    image_url: string | null;
    is_ai_generated: boolean | null;
    user_uploaded: boolean | null;
  };
};

export function usePlaylistTracks(playlistId?: string) {
  const [tracks, setTracks] = useState<PlaylistTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTracks = async () => {
    if (!playlistId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('playlist_tracks')
        .select(`
          id,
          position,
          added_at,
          track:tracks (
            id,
            title,
            artist,
            album,
            duration,
            audio_url,
            image_url,
            is_ai_generated,
            user_uploaded
          )
        `)
        .eq('playlist_id', playlistId)
        .order('position', { ascending: true });

      if (error) throw error;
      setTracks((data as any) || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracks();
  }, [playlistId]);

  const addTrack = async (playlistId: string, trackId: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await addTrackToPlaylist(playlistId, trackId);
      await fetchTracks(); // Refresh tracks
      return result;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const removeTrack = async (playlistId: string, trackId: string) => {
    try {
      setLoading(true);
      setError(null);
      await removeTrackFromPlaylist(playlistId, trackId);
      await fetchTracks(); // Refresh tracks
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { tracks, addTrack, removeTrack, loading, error, refetch: fetchTracks } as const;
}
