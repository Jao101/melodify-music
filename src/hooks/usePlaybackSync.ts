import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getPlaybackState, upsertPlaybackState } from "@/services/playbackService";

export function usePlaybackSync(params: { trackId?: string; positionSec: number; isPlaying: boolean }) {
  const { user } = useAuth();
  const lastSentRef = useRef<number>(0);

  // Heartbeat to persist playback every ~5s when playing
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      try {
        if (!params.trackId || !params.isPlaying) return;
        const now = Date.now();
        if (now - lastSentRef.current < 4000) return;
        lastSentRef.current = now;
        void upsertPlaybackState(params.trackId, Math.floor(params.positionSec || 0));
      } catch {
        // ignore heartbeat errors
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [user, params.trackId, params.positionSec, params.isPlaying]);

  return {
    loadPlaybackState: getPlaybackState,
  } as const;
}
