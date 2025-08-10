import { useEffect, useRef, useState, useCallback, createContext, useContext } from "react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPlaybackState, upsertPlaybackState } from "@/services/playbackService";
import { useAuth } from "@/contexts/AuthContext";
import type { Json, Tables } from "@/integrations/supabase/types";

export type BaseTrack = {
  id: string;
  title?: string | null;
  artist?: string | null;
  album?: string | null;
  duration?: number | null;
  audio_url?: string | null;
  image_url?: string | null;
  user_uploaded?: boolean | null;
  metadata?: Json | null;
};

export function isPlayableTrack(t: BaseTrack | undefined | null): boolean {
  if (!t) return false;
  const hasAudioUrl = !!t.audio_url;
  const hasStoragePath = (() => {
    const m = t?.metadata;
    if (!m || typeof m !== 'object' || Array.isArray(m)) return false;
    const val = (m as Record<string, unknown>)["storage_path"];
    return typeof val === 'string' && val.length > 0;
  })();
  return hasAudioUrl || hasStoragePath;
}

async function resolvePlayableUrl(track: BaseTrack): Promise<string | null> {
  // For private bucket files, create signed URL using stored path
  const storagePath: string | undefined = (() => {
    const m = track?.metadata;
    if (!m || typeof m !== 'object' || Array.isArray(m)) return undefined;
    const val = (m as Record<string, unknown>)["storage_path"];
    return typeof val === 'string' ? val : undefined;
  })();
  if (track.user_uploaded) {
    let path = storagePath;
    if (!path && track.audio_url) {
      const marker = "/user-songs/";
      const idx = track.audio_url.indexOf(marker);
      if (idx !== -1) {
        path = track.audio_url.substring(idx + marker.length);
      }
    }
    if (path) {
      const { data } = await supabase.storage.from("user-songs").createSignedUrl(path, 60 * 60);
      if (data?.signedUrl) return data.signedUrl;
    }
  }
  return track.audio_url ?? null;
}

type PlayerAPI = {
  currentTrack: BaseTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  queue: BaseTrack[];
  setQueue: (q: BaseTrack[]) => void;
  setVolume: (v: number) => void;
  play: (t: BaseTrack, list?: BaseTrack[]) => Promise<void>;
  prime: (t: BaseTrack, positionSec: number, list?: BaseTrack[]) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  next: () => void;
  previous: () => void;
  seek: (time: number) => void;
};

const AudioPlayerContext = createContext<PlayerAPI | undefined>(undefined);

function useProvideAudioPlayer(): PlayerAPI {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrack, setCurrentTrack] = useState<BaseTrack | null>(null);
  const [queue, setQueueState] = useState<BaseTrack[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const VOLUME_KEY = "player_volume_v1";
  const [volume, setVolume] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(VOLUME_KEY);
      if (raw === null) return 50; // no stored value -> default
      const v = Number(raw);
      if (Number.isFinite(v)) return Math.max(0, Math.min(100, Math.round(v)));
    } catch {
      // ignore
    }
    return 50;
  });
  const { user } = useAuth();
  const resumedOnceRef = useRef(false);
  const QUEUE_KEY = "playback_queue_v1";
  
  // Local fallback for persistence if DB sync fails or user is unauthenticated
  const LOCAL_KEY = "playback_state_v1";

  const saveLocalState = useCallback((state: { track: BaseTrack; position: number } | null) => {
    try {
      if (state) {
        localStorage.setItem(LOCAL_KEY, JSON.stringify({
          track_id: state.track.id,
          position: state.position,
          timestamp: Date.now()
        }));
      } else {
        localStorage.removeItem(LOCAL_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const saveLocalQueue = useCallback((q: BaseTrack[]) => {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(q.map(t => t.id)));
    } catch {
      // ignore
    }
  }, []);

  const loadLocalQueue = useCallback((): string[] | null => {
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      if (!raw) return null;
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr as string[] : null;
    } catch { return null; }
  }, []);

  const setQueue = useCallback((q: BaseTrack[]) => {
    setQueueState(q);
    saveLocalQueue(q);
    // Immediately sync to DB when queue changes
    if (user) {
      import("@/services/playbackService").then(({ setPlaybackQueue }) => {
        void setPlaybackQueue(q.map(t => t.id)).catch(() => {});
      }).catch(() => {});
    }
  }, [saveLocalQueue, user]);

  // Initialize audio element once
  useEffect(() => {
    if (audioRef.current) return;
    const el = new Audio();
    el.preload = "metadata";
    el.volume = volume / 100;
    audioRef.current = el;

    const onTime = () => setCurrentTime(el.currentTime);
    const onLoaded = () => setDuration(Number.isFinite(el.duration) ? el.duration : 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);

    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.pause();
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume]);

  // Persist volume
  useEffect(() => {
    try {
      localStorage.setItem(VOLUME_KEY, String(volume));
    } catch {
      // ignore
    }
  }, [volume]);

  // Sync current time to Supabase periodically when playing and user is logged in
  useEffect(() => {
    if (!isPlaying || !currentTrack || !user) return;

    const interval = setInterval(() => {
      upsertPlaybackState(currentTrack.id, currentTime).catch(() => {});
    }, 5000); // every 5 seconds

    return () => clearInterval(interval);
  }, [isPlaying, currentTrack, currentTime, user]);

  // Try to restore from local state on mount (without starting playback)
  useEffect(() => {
    if (resumedOnceRef.current) return;
    resumedOnceRef.current = true;

    (async () => {
      try {
        // Try to restore queue from localStorage
        const localQueueIds = loadLocalQueue();
        if (localQueueIds?.length) {
          const { data: tracks } = await supabase
            .from('tracks')
            .select('*')
            .in('id', localQueueIds);
          
          if (tracks?.length) {
            // Preserve order from localStorage
            const orderedTracks = localQueueIds
              .map(id => tracks.find(t => t.id === id))
              .filter(Boolean) as BaseTrack[];
            setQueueState(orderedTracks);
          }
        }

        // Try to restore playback state
        if (user) {
          const state = await getPlaybackState();
          if (state?.track_id) {
            const { data: track } = await supabase
              .from('tracks')
              .select('*')
              .eq('id', state.track_id)
              .single();
            
            if (track && isPlayableTrack(track)) {
              setCurrentTrack(track);
              if (audioRef.current) {
                const url = await resolvePlayableUrl(track);
                if (url) {
                  audioRef.current.src = url;
                  audioRef.current.currentTime = state.position || 0;
                  if (state.volume !== null) {
                    const vol = Math.max(0, Math.min(100, state.volume));
                    setVolume(vol);
                  }
                }
              }
            }
          }
        } else {
          // Fallback to localStorage for unauthenticated users
          try {
            const raw = localStorage.getItem(LOCAL_KEY);
            if (raw) {
              const saved = JSON.parse(raw);
              if (saved.track_id && saved.timestamp > Date.now() - 24 * 60 * 60 * 1000) {
                const { data: track } = await supabase
                  .from('tracks')
                  .select('*')
                  .eq('id', saved.track_id)
                  .single();
                
                if (track && isPlayableTrack(track)) {
                  setCurrentTrack(track);
                  if (audioRef.current) {
                    const url = await resolvePlayableUrl(track);
                    if (url) {
                      audioRef.current.src = url;
                      audioRef.current.currentTime = saved.position || 0;
                    }
                  }
                }
              }
            }
          } catch {
            // ignore
          }
        }
      } catch (error) {
        console.error('Error restoring playback state:', error);
      }
    })();
  }, [user, loadLocalQueue]);

  const play = useCallback(async (track: BaseTrack, list?: BaseTrack[]) => {
    if (!isPlayableTrack(track)) {
      console.warn('Track is not playable:', track);
      return;
    }

    try {
      const url = await resolvePlayableUrl(track);
      if (!url) {
        console.error('Could not resolve playable URL for track:', track);
        return;
      }

      if (audioRef.current) {
        audioRef.current.src = url;
        setCurrentTrack(track);
        
        if (list) {
          setQueue(list);
        }

        await audioRef.current.play();
        setIsPlaying(true);
        
        // Save state immediately when playing starts
        saveLocalState({ track, position: 0 });
        
        // Also sync to DB immediately if user is logged in
        if (user) {
          upsertPlaybackState(track.id, 0).catch(() => {});
        }
      }
    } catch (error) {
      console.error('Error playing track:', error);
      setIsPlaying(false);
    }
  }, [setQueue, saveLocalState, user, volume]);

  const prime = useCallback(async (track: BaseTrack, positionSec: number, list?: BaseTrack[]) => {
    if (!isPlayableTrack(track)) return;

    try {
      const url = await resolvePlayableUrl(track);
      if (!url) return;

      if (audioRef.current) {
        audioRef.current.src = url;
        setCurrentTrack(track);
        
        if (list) {
          setQueue(list);
        }

        audioRef.current.currentTime = positionSec;
        setCurrentTime(positionSec);
        
        // Don't start playing, just prime
        saveLocalState({ track, position: positionSec });
      }
    } catch (error) {
      console.error('Error priming track:', error);
    }
  }, [setQueue, saveLocalState]);

  const togglePlayPause = useCallback(async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        if (currentTrack) {
          saveLocalState({ track: currentTrack, position: audioRef.current.currentTime });
          if (user) {
            upsertPlaybackState(currentTrack.id, audioRef.current.currentTime).catch(() => {});
          }
        }
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
        if (currentTrack) {
          saveLocalState({ track: currentTrack, position: audioRef.current.currentTime });
          if (user) {
            upsertPlaybackState(currentTrack.id, audioRef.current.currentTime).catch(() => {});
          }
        }
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error);
      setIsPlaying(false);
    }
  }, [isPlaying, currentTrack, saveLocalState, user, volume]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      if (currentTrack) {
        saveLocalState({ track: currentTrack, position: time });
        if (user) {
          upsertPlaybackState(currentTrack.id, time).catch(() => {});
        }
      }
    }
  }, [currentTrack, saveLocalState, user, isPlaying, volume]);

  const next = useCallback(() => {
    if (!currentTrack || queue.length === 0) return;
    const i = queue.findIndex((t) => t.id === currentTrack.id);
    const nextTrack = queue[i + 1];
    if (nextTrack) {
      void play(nextTrack, queue);
      // persist snapshot at start of next track
      saveLocalState({ track: nextTrack, position: 0 });
    } else {
      setIsPlaying(false);
    }
  }, [currentTrack, queue, play, saveLocalState]);

  const previous = useCallback(() => {
    if (!currentTrack || queue.length === 0) return;
    const i = queue.findIndex((t) => t.id === currentTrack.id);
    const prevTrack = queue[i - 1];
    if (prevTrack) void play(prevTrack, queue);
  }, [currentTrack, queue, play]);

  // Handle track end with proper dependencies - FIX for auto-next
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onEnded = () => { 
      console.log('Track ended, calling next()');
      next(); 
    };

    el.addEventListener("ended", onEnded);

    return () => {
      el.removeEventListener("ended", onEnded);
    };
  }, [next]);

  // Media Session action handlers for OS media keys
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const ms = (navigator as any).mediaSession;
    try {
      ms.setActionHandler('play', async () => { if (audioRef.current) await audioRef.current.play().catch(() => {}); });
      ms.setActionHandler('pause', () => { audioRef.current?.pause(); });
      ms.setActionHandler('stop', () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; } });
      ms.setActionHandler('previoustrack', () => { previous(); });
      ms.setActionHandler('nexttrack', () => { next(); });
      ms.setActionHandler('seekbackward', (details: any) => { const step = details?.seekOffset || 10; if (audioRef.current) seek(Math.max(0, audioRef.current.currentTime - step)); });
      ms.setActionHandler('seekforward', (details: any) => { const step = details?.seekOffset || 10; if (audioRef.current) seek(audioRef.current.currentTime + step); });
      ms.setActionHandler('seekto', (details: any) => { if (audioRef.current && typeof details.seekTime === 'number') seek(details.seekTime); });
    } catch { /* ignore */ }
  }, [next, previous, seek]);

  return { 
    currentTrack, 
    isPlaying, 
    currentTime, 
    duration, 
    volume, 
    queue, 
    setQueue, 
    setVolume, 
    play, 
    prime, 
    togglePlayPause, 
    next, 
    previous, 
    seek 
  };
}

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const audioPlayer = useProvideAudioPlayer();
  return (
    <AudioPlayerContext.Provider value={audioPlayer}>
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer(): PlayerAPI {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error("useAudioPlayer must be used within an AudioPlayerProvider");
  return ctx;
}
