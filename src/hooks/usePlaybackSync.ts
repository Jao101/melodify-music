import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getPlaybackState, upsertPlaybackState } from "@/services/playbackService";

export function usePlaybackSync(params: { trackId?: string; positionSec: number; isPlaying: boolean }) {
  const { user } = useAuth();
  const lastSentRef = useRef<number>(0);

  // DISABLED: This hook is now redundant since useAudioPlayer handles playback sync
  // Keeping the hook interface for compatibility but removing the logic
  useEffect(() => {
    // No-op: useAudioPlayer now handles all playback persistence
    console.log('🔄 usePlaybackSync is disabled - useAudioPlayer handles persistence');
  }, [user, params.trackId, params.positionSec, params.isPlaying]);

  return {
    loadPlaybackState: getPlaybackState,
  } as const;
}
