import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PlaylistWithDetails = {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  is_public: boolean | null;
  created_at: string;
  updated_at: string;
  owner_id: string;
  track_count: number;
  total_duration: number;
  owner_display_name?: string;
};

export function usePlaylist(playlistId: string) {
  const { user } = useAuth();
  const [playlist, setPlaylist] = useState<PlaylistWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlaylist = async () => {
      if (!playlistId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Fetch playlist details
        const { data: playlistData, error: playlistError } = await supabase
          .from('playlists')
          .select(`
            *,
            profiles:owner_id (display_name)
          `)
          .eq('id', playlistId)
          .single();

        if (playlistError) throw playlistError;

        // Fetch track count and total duration
        const { data: tracksData, error: tracksError } = await supabase
          .from('playlist_tracks')
          .select(`
            track:tracks (duration)
          `)
          .eq('playlist_id', playlistId);

        if (tracksError) throw tracksError;

        const trackCount = tracksData?.length || 0;
        const totalDuration = tracksData?.reduce((total, item: any) => 
          total + (item.track?.duration || 0), 0) || 0;

        setPlaylist({
          ...playlistData,
          track_count: trackCount,
          total_duration: totalDuration,
          owner_display_name: (playlistData.profiles as any)?.display_name
        });
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylist();
  }, [playlistId]);

  return { playlist, loading, error, refetch: () => {
    const fetchPlaylist = async () => {
      // Re-implementation for refetch - same as above
      if (!playlistId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const { data: playlistData, error: playlistError } = await supabase
          .from('playlists')
          .select(`
            *,
            profiles:owner_id (display_name)
          `)
          .eq('id', playlistId)
          .single();

        if (playlistError) throw playlistError;

        const { data: tracksData, error: tracksError } = await supabase
          .from('playlist_tracks')
          .select(`
            track:tracks (duration)
          `)
          .eq('playlist_id', playlistId);

        if (tracksError) throw tracksError;

        const trackCount = tracksData?.length || 0;
        const totalDuration = tracksData?.reduce((total, item: any) => 
          total + (item.track?.duration || 0), 0) || 0;

        setPlaylist({
          ...playlistData,
          track_count: trackCount,
          total_duration: totalDuration,
          owner_display_name: (playlistData.profiles as any)?.display_name
        });
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPlaylist();
  }};
}