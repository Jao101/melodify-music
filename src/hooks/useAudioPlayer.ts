import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPlaybackState, upsertPlaybackState } from "@/services/playbackService";
import { useAuth } from "@/contexts/AuthContext";

export type BaseTrack = {
  id: string;
  title?: string | null;
  artist?: string | null;
  album?: string | null;
  duration?: number | null;
  audio_url?: string | null;
  image_url?: string | null;
  user_uploaded?: boolean | null;
  metadata?: any;
};

export function isPlayableTrack(t: BaseTrack | undefined | null): boolean {
  if (!t) return false;
  const hasAudioUrl = !!t.audio_url;
  const hasStoragePath = !!t?.metadata?.storage_path;
  return hasAudioUrl || hasStoragePath;
}

async function resolvePlayableUrl(track: BaseTrack): Promise<string | null> {
  // For private bucket files, create signed URL using stored path
  const storagePath: string | undefined = track?.metadata?.storage_path;
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

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrack, setCurrentTrack] = useState<BaseTrack | null>(null);
  const [queue, setQueue] = useState<BaseTrack[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(75);
  const { user } = useAuth();
  const resumedOnceRef = useRef(false);
  
  // Local fallback for persistence if DB sync fails or user is unauthenticated
  const LOCAL_KEY = "playback_state_v1";
  const saveLocalState = useCallback((state: { track: BaseTrack; position: number }) => {
    try {
      const payload = {
        track_id: state.track.id,
        position: Math.max(0, Math.floor(state.position || 0)),
        updated_at: new Date().toISOString(),
        snapshot: {
          id: state.track.id,
          title: state.track.title ?? null,
          artist: state.track.artist ?? null,
          album: state.track.album ?? null,
          duration: state.track.duration ?? null,
          audio_url: state.track.audio_url ?? null,
          image_url: state.track.image_url ?? null,
          user_uploaded: state.track.user_uploaded ?? null,
          metadata: state.track.metadata ?? null,
        },
      };
      localStorage.setItem(LOCAL_KEY, JSON.stringify(payload));
    } catch {}
  }, []);
  const loadLocalState = useCallback((): { track: BaseTrack; position: number } | null => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.snapshot?.id) return null;
      return { track: parsed.snapshot as BaseTrack, position: parsed.position || 0 };
    } catch {
      return null;
    }
  }, []);

  // Initialize audio element once
  useEffect(() => {
    if (audioRef.current) return;
    const el = new Audio();
    el.preload = "metadata";
    el.volume = volume / 100;
    audioRef.current = el;

    const onTime = () => setCurrentTime(el.currentTime);
    const onLoaded = () => setDuration(Number.isFinite(el.duration) ? el.duration : 0);
    const onEnded = () => {
      next();
    };

    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("ended", onEnded);

    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("ended", onEnded);
      el.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume]);

  const play = useCallback(async (track: BaseTrack, list?: BaseTrack[]) => {
    if (list) setQueue(list);
    const url = await resolvePlayableUrl(track);
    if (!url) return;
    setCurrentTrack(track);
    setIsPlaying(true);
    setCurrentTime(0);
    // Save local snapshot for robust resume
    saveLocalState({ track, position: 0 });
    if (audioRef.current) {
      audioRef.current.src = url;
      await audioRef.current.play().catch(() => {});
    }
  }, [saveLocalState]);

  const prime = useCallback(async (track: BaseTrack, positionSec: number, list?: BaseTrack[]) => {
    if (list) setQueue(list);
    const url = await resolvePlayableUrl(track);
    if (!url) return;
    setCurrentTrack(track);
    setIsPlaying(false);
    setCurrentTime(positionSec || 0);
    // Save local snapshot for robust resume
    saveLocalState({ track, position: positionSec || 0 });
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.currentTime = Math.max(0, positionSec || 0);
      audioRef.current.pause();
    }
  }, [saveLocalState]);

  // Auto-resume last playback state (paused) once when user is ready
  useEffect(() => {
    let cancelled = false;
    if (!user) return; // wait for authenticated user
    if (resumedOnceRef.current) return; // only once per session
    (async () => {
      try {
        const state = await getPlaybackState().catch(() => null);
        if (state?.track_id) {
          const { data, error } = await supabase
            .from("tracks")
            .select("*")
            .eq("id", state.track_id)
            .maybeSingle();
          if (!error && data && isPlayableTrack(data as any) && !cancelled) {
            await prime(data as any, state.position || 0, [data as any]);
            resumedOnceRef.current = true;
            return;
          }
        }
        // Fallback to local snapshot
        const local = loadLocalState();
        if (local && isPlayableTrack(local.track) && !cancelled) {
          await prime(local.track, local.position || 0, [local.track]);
          resumedOnceRef.current = true;
        }
      } catch {
        // ignore resume errors
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, prime, loadLocalState]);

  // Persist position when the document is hidden/unloading
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden" && currentTrack) {
  const pos = Math.floor(audioRef.current?.currentTime || currentTime || 0);
  void upsertPlaybackState(currentTrack.id, pos).catch(() => {});
  saveLocalState({ track: currentTrack, position: pos });
      }
    };
    const onBeforeUnload = () => {
      if (currentTrack) {
        try {
    const pos = Math.floor(audioRef.current?.currentTime || currentTime || 0);
    void upsertPlaybackState(currentTrack.id, pos);
    saveLocalState({ track: currentTrack, position: pos });
        } catch {}
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [currentTrack, currentTime, saveLocalState]);

  const togglePlayPause = useCallback(async () => {
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
  // Persist the paused position immediately
  void upsertPlaybackState(currentTrack.id, Math.floor(audioRef.current.currentTime || 0)).catch(() => {});
    } else {
      await audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [currentTrack, isPlaying]);

  const seek = useCallback((time: number) => {
    if (!audioRef.current) return;
    const target = Math.max(0, Math.min(time, duration || time));
    audioRef.current.currentTime = target;
    setCurrentTime(target);
  }, [duration]);

  const next = useCallback(() => {
    if (!currentTrack || queue.length === 0) return;
    const i = queue.findIndex((t) => t.id === currentTrack.id);
    const nextTrack = queue[i + 1];
    if (nextTrack) void play(nextTrack, queue);
    else setIsPlaying(false);
  }, [currentTrack, queue, play]);

  const previous = useCallback(() => {
    if (!currentTrack || queue.length === 0) return;
    const i = queue.findIndex((t) => t.id === currentTrack.id);
    const prevTrack = queue[i - 1];
    if (prevTrack) void play(prevTrack, queue);
  }, [currentTrack, queue, play]);

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
    seek,
  } as const;
}
