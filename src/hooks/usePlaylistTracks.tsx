import { useState } from "react";
import { addTrackToPlaylist } from "@/services/playlistService";

export function usePlaylistTracks() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addTrack = async (playlistId: string, trackId: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await addTrackToPlaylist(playlistId, trackId);
      return result;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { addTrack, loading, error } as const;
}
