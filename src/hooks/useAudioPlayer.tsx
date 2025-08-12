import { useEffect, useRef, useState, useCallback, createContext, useContext } from "react";
import type { ReactNode } from "react";
import { supabase } from "../integrations/supabase/client";
import { getPlaybackState, upsertPlaybackState, testPlaybackState } from "../services/playbackServiceLocal";
import { useAuth } from "../contexts/AuthContext";
import type { Json, Tables } from "../integrations/supabase/types";
import { buildAudioProxyUrl } from "../utils/apiUtils";

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
  const hasFileUrl = !!(t as any).file_url; // Support for file_url from Supabase tracks
  
  const hasStoragePath = (() => {
    const m = t?.metadata;
    if (!m || typeof m !== 'object' || Array.isArray(m)) return false;
    const val = (m as Record<string, unknown>)["storage_path"];
    return typeof val === 'string' && val.length > 0;
  })();
  
  const isPlayable = hasAudioUrl || hasFileUrl || hasStoragePath;
  
  console.log('🔍 isPlayableTrack check:', {
    trackId: t.id,
    title: t.title,
    hasAudioUrl,
    hasFileUrl,
    hasStoragePath,
    isPlayable,
    audio_url: t.audio_url,
    file_url: (t as any).file_url
  });
  
  return isPlayable;
}

async function resolvePlayableUrl(track: BaseTrack): Promise<string | null> {
  // Get the audio URL - could be audio_url or file_url depending on the data source
  const audioUrl = track.audio_url || (track as any).file_url;
  
  console.log('🔍 resolvePlayableUrl for track:', {
    id: track.id,
    title: track.title,
    audio_url: track.audio_url,
    file_url: (track as any).file_url,
    finalAudioUrl: audioUrl,
    user_uploaded: track.user_uploaded
  });
  
  // If we have a direct URL and it's a public URL, try to use it directly
  if (audioUrl && audioUrl.includes('/object/public/')) {
    // Extract the path from the public URL to create a signed URL instead
    // For Nextcloud URLs, always use proxy to avoid CORS issues
    if (audioUrl.includes('alpenview.ch') || audioUrl.includes('/download')) {
      console.log('🔗 Nextcloud URL detected, using proxy to avoid CORS');
      const proxyUrl = buildAudioProxyUrl(audioUrl);
      return proxyUrl;
    }
    
    const marker = "/user-songs/";
    const idx = audioUrl.indexOf(marker);
    if (idx !== -1) {
      const path = audioUrl.substring(idx + marker.length);
      console.log('🔍 Extracted path from public URL:', path);
      
      // Legacy Supabase URLs - return as-is (no signed URL creation)
      console.log('⚠️ Legacy Supabase URL detected, using public URL directly');
      return audioUrl;
    }
    
    // Fallback to decoded public URL
    const decodedUrl = decodeURIComponent(audioUrl);
    console.log('✅ Using direct public URL (decoded):', decodedUrl);
    return decodedUrl;
  }
  
  // For private bucket files, create signed URL using stored path
  const storagePath: string | undefined = (() => {
    const m = track?.metadata;
    if (!m || typeof m !== 'object' || Array.isArray(m)) return undefined;
    const val = (m as Record<string, unknown>)["storage_path"];
    return typeof val === 'string' ? val : undefined;
  })();
  
  console.log('🔍 Storage path from metadata:', storagePath);
  
  // For user uploaded tracks (both own and public tracks from others)
  if (track.user_uploaded) {
    let path = storagePath;
    
    if (!path && audioUrl) {
      const marker = "/user-songs/";
      const idx = audioUrl.indexOf(marker);
      if (idx !== -1) {
        path = audioUrl.substring(idx + marker.length);
        console.log('🔍 Extracted path from audioUrl:', path);
      }
    }
    
    // Nextcloud migration: Only process tracks with Nextcloud URLs
    if (!audioUrl || (!audioUrl.includes('alpenview.ch') && !audioUrl.includes('/download'))) {
      console.log('⚠️ Legacy track without Nextcloud URL, skipping');
      return null;
    }
    
    // Return Nextcloud URL via proxy to avoid CORS
    console.log('📁 Using Nextcloud URL via proxy for track:', track.id, audioUrl);
    const proxyUrl = buildAudioProxyUrl(audioUrl);
    return proxyUrl;
  }

  // Fall back to direct URL (should be Nextcloud)
  console.log('📁 Using fallback URL for track:', track.id, audioUrl);
  return audioUrl ?? null;
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
  stop: () => void;
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
  const lastSaveTimeRef = useRef(0);
  const SAVE_THROTTLE_MS = 1500; // Throttle saves to every 1.5 seconds
  
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
      import("../services/playbackServiceLocal").then(({ setPlaybackQueue }) => {
        void setPlaybackQueue(q.map(t => t.id)).catch(() => {});
      }).catch(() => {});
    }
  }, [saveLocalQueue, user]);

  // Stop function für Media Session API
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    if (currentTrack) {
      saveLocalState({ track: currentTrack, position: 0 });
      if (user) upsertPlaybackState(currentTrack.id, 0).catch(() => {});
    }
  }, [currentTrack, saveLocalState, user]);

  // Initialize audio element once
  useEffect(() => {
    if (audioRef.current) return;
    const el = new Audio();
    el.preload = "metadata";
    el.volume = volume / 100;
    audioRef.current = el;

    const savePositionThrottled = (currentTime: number) => {
      const now = Date.now();
      if (now - lastSaveTimeRef.current >= SAVE_THROTTLE_MS && currentTrack) {
        lastSaveTimeRef.current = now;
        console.log('🔄 Throttled save at position:', currentTime);
        // Always save locally
        saveLocalState({ track: currentTrack, position: currentTime });
        // Save to DB if user is logged in
        if (user) {
          upsertPlaybackState(currentTrack.id, currentTime).catch(() => {});
        }
      }
    };

    const onTime = () => {
      const time = el.currentTime;
      setCurrentTime(time);
      
      // Check if duration became available during playback
      if ((!duration || duration <= 0) && Number.isFinite(el.duration) && el.duration > 0) {
        console.log('🔄 Duration became available during playback:', el.duration);
        setDuration(el.duration);
      }
      
      // Auto-save position during playback (throttled)
      if (isPlaying && currentTrack) {
        savePositionThrottled(time);
      }
    };
    
    const onLoaded = () => {
      const trackDuration = Number.isFinite(el.duration) ? el.duration : 0;
      console.log('🎵 Track metadata loaded - Audio Duration:', trackDuration, 'seconds');
      if (trackDuration > 0) {
        setDuration(trackDuration);
      }
    };
    
    const onDurationChange = () => {
      const trackDuration = Number.isFinite(el.duration) ? el.duration : 0;
      console.log('🎵 Duration changed - New Audio Duration:', trackDuration, 'seconds');
      if (trackDuration > 0) {
        setDuration(trackDuration);
      }
    };
    
    const onCanPlay = () => {
      const trackDuration = Number.isFinite(el.duration) ? el.duration : 0;
      console.log('🎵 Can play - Audio Duration:', trackDuration, 'seconds');
      if (trackDuration > 0) {
        setDuration(trackDuration);
      }
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("durationchange", onDurationChange);
    el.addEventListener("canplay", onCanPlay);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);

    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("durationchange", onDurationChange);
      el.removeEventListener("canplay", onCanPlay);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.pause();
    };
  }, [volume, isPlaying, currentTrack, user, saveLocalState, duration]);

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

  // Sync current time to Supabase more frequently when playing and user is logged in
  useEffect(() => {
    if (!isPlaying || !currentTrack || !user) return;

    const interval = setInterval(() => {
      if (audioRef.current) {
        const currentPos = audioRef.current.currentTime;
        console.log('💾 Auto-saving playback position:', currentPos);
        upsertPlaybackState(currentTrack.id, currentPos).catch(() => {});
        saveLocalState({ track: currentTrack, position: currentPos });
      }
    }, 2000); // every 2 seconds for more frequent saves

    return () => clearInterval(interval);
  }, [isPlaying, currentTrack, user, saveLocalState]);

  // Update currentTime more frequently to ensure smooth progress bar
  useEffect(() => {
    if (!isPlaying || !audioRef.current) return;

    const interval = setInterval(() => {
      if (audioRef.current) {
        const time = audioRef.current.currentTime;
        setCurrentTime(time);
        
        // Also check if duration became available
        if ((!duration || duration <= 0) && Number.isFinite(audioRef.current.duration) && audioRef.current.duration > 0) {
          console.log('🔄 Duration became available via interval check:', audioRef.current.duration);
          setDuration(audioRef.current.duration);
        }
      }
    }, 500); // Update every 500ms for smooth progress

    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  // Save position immediately when playback stops (pause/stop)
  useEffect(() => {
    if (!currentTrack || !user) return;
    
    // If we're not playing and we have a current time > 0, save it immediately
    if (!isPlaying && currentTime > 0) {
      console.log('⏸️ Saving position on pause:', currentTime);
      upsertPlaybackState(currentTrack.id, currentTime).catch(() => {});
      saveLocalState({ track: currentTrack, position: currentTime });
    }
  }, [isPlaying, currentTrack, currentTime, user, saveLocalState]);

  // Media Session API für Hardware-Medientasten und Tab-Titel mit Laufschrift
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const ms = (navigator as any).mediaSession;
    try {
      ms.setActionHandler('play', async () => {
        if (audioRef.current) {
          await audioRef.current.play().catch(() => {});
          setIsPlaying(true);
        }
      });
      ms.setActionHandler('pause', () => {
        if (audioRef.current) {
          audioRef.current.pause();
          setIsPlaying(false);
        }
      });
      ms.setActionHandler('stop', () => {
        stop();
      });
      ms.setActionHandler('previoustrack', () => {
        previous();
      });
      ms.setActionHandler('nexttrack', () => {
        next();
      });
      ms.setActionHandler('seekbackward', (details: any) => {
        const step = details?.seekOffset || 10;
        if (audioRef.current) seek(Math.max(0, audioRef.current.currentTime - step));
      });
      ms.setActionHandler('seekforward', (details: any) => {
        const step = details?.seekOffset || 10;
        if (audioRef.current) seek(audioRef.current.currentTime + step);
      });
      ms.setActionHandler('seekto', (details: any) => {
        if (audioRef.current && typeof details.seekTime === 'number') seek(details.seekTime);
      });

      // Media Session Metadata für bessere Integration
      if (currentTrack) {
        ms.metadata = new MediaMetadata({
          title: currentTrack.title || 'Unknown Title',
          artist: currentTrack.artist || 'Unknown Artist',
          album: currentTrack.album || 'Unknown Album',
          artwork: currentTrack.image_url ? [
            { src: currentTrack.image_url, sizes: '512x512', type: 'image/jpeg' }
          ] : []
        });
      }
    } catch {
      // ignore errors
    }
  }, [stop, currentTrack]);

  // Einfacher statischer Tab-Titel (Laufschrift deaktiviert)
  useEffect(() => {
    const originalTitle = "Melodify";

    if (currentTrack && isPlaying) {
      // Zeige einfach den Track-Titel
      document.title = `▶ ${currentTrack.artist || 'Unknown Artist'} - ${currentTrack.title || 'Unknown Title'} | ${originalTitle}`;
    } else if (currentTrack && !isPlaying) {
      // Pausiert - zeige statischen Titel
      document.title = `⏸ ${currentTrack.artist || 'Unknown Artist'} - ${currentTrack.title || 'Unknown Title'} | ${originalTitle}`;
    } else {
      // Kein Track - zeige normalen Titel
      document.title = originalTitle;
    }
  }, [currentTrack, isPlaying]);

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
          console.log('🔄 Attempting to restore playback state for user:', user.id);
          
          // Test table access first
          const tableAccessible = await testPlaybackState();
          if (!tableAccessible) {
            console.error('❌ Playback state table is not accessible, skipping DB sync');
          }
          
          const state = await getPlaybackState("dummy");
          console.log('💾 Playback state from DB:', state);
          
          if (state?.track_id) {
            const { data: track } = await supabase
              .from('tracks')
              .select('*')
              .eq('id', state.track_id)
              .single();
            
            console.log('🎵 Track found for restoration:', track?.title);
            
            if (track && isPlayableTrack(track)) {
              setCurrentTrack(track);
              // Initialize duration from track data immediately
              if (track.duration && track.duration > 0) {
                setDuration(track.duration);
                console.log('🎵 Set initial duration from track data:', track.duration);
              }
              if (audioRef.current) {
                const url = await resolvePlayableUrl(track);
                if (url) {
                  audioRef.current.src = url;
                  
                  // Wait for metadata to load and get accurate duration
                  const onLoadedMetadata = () => {
                    if (audioRef.current && Number.isFinite(audioRef.current.duration) && audioRef.current.duration > 0) {
                      setDuration(audioRef.current.duration);
                      console.log('🎵 Updated duration from audio metadata:', audioRef.current.duration);
                    }
                    audioRef.current?.removeEventListener('loadedmetadata', onLoadedMetadata);
                  };
                  audioRef.current.addEventListener('loadedmetadata', onLoadedMetadata);
                  
                  if (state.position && state.position > 0) {
                    audioRef.current.currentTime = state.position;
                    setCurrentTime(state.position); // Also set the state
                    console.log('⏰ Restored position:', state.position);
                  }
                  if (state.volume !== null && state.volume !== undefined) {
                    const vol = Math.max(0, Math.min(100, state.volume));
                    setVolume(vol);
                    console.log('🔊 Restored volume:', vol);
                  }
                }
              }
            }
          } else {
            console.log('ℹ️ No saved playback state found');
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
                  // Initialize duration from track data immediately
                  if (track.duration && track.duration > 0) {
                    setDuration(track.duration);
                    console.log('🎵 Set initial duration from track data (localStorage):', track.duration);
                  }
                  if (audioRef.current) {
                    const url = await resolvePlayableUrl(track);
                    if (url) {
                      audioRef.current.src = url;
                      
                      // Wait for metadata to load and get accurate duration
                      const onLoadedMetadata = () => {
                        if (audioRef.current && Number.isFinite(audioRef.current.duration) && audioRef.current.duration > 0) {
                          setDuration(audioRef.current.duration);
                          console.log('🎵 Updated duration from audio metadata (localStorage):', audioRef.current.duration);
                        }
                        audioRef.current?.removeEventListener('loadedmetadata', onLoadedMetadata);
                      };
                      audioRef.current.addEventListener('loadedmetadata', onLoadedMetadata);
                      
                      if (saved.position && saved.position > 0) {
                        audioRef.current.currentTime = saved.position;
                        setCurrentTime(saved.position); // Also set the state
                        console.log('⏰ Restored position from localStorage:', saved.position);
                      }
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
    console.log('🎵 Play function called with track:', {
      id: track.id,
      title: track.title,
      user_uploaded: track.user_uploaded,
      audio_url: track.audio_url,
      file_url: (track as any).file_url,
      metadata: track.metadata
    });
    
    if (!isPlayableTrack(track)) {
      console.error('🚨 Track is not playable:', track);
      throw new Error('Track is not playable - missing audio URL');
    }

    try {
      console.log('🔄 Resolving playable URL...');
      const url = await resolvePlayableUrl(track);
      if (!url) {
        console.error('🚨 Could not resolve playable URL for track:', track);
        throw new Error('Could not resolve playable URL');
      }

      console.log('✅ Resolved URL:', url);

      if (audioRef.current) {
        console.log('🎵 Setting audio source to:', url);
        audioRef.current.src = url;
        setCurrentTrack(track);
        
        if (list) {
          setQueue(list);
        }

        // Add error event listener before loading
        const onAudioError = (e: Event) => {
          const audio = e.target as HTMLAudioElement;
          console.error('🚨 Audio element error during load:', {
            error: audio.error,
            src: audio.src,
            readyState: audio.readyState,
            networkState: audio.networkState
          });
          if (audio.error) {
            console.error('🚨 MediaError details:', {
              code: audio.error.code,
              message: audio.error.message
            });
          }
        };
        
        audioRef.current.addEventListener('error', onAudioError);
        
        // Skip URL accessibility test for proxy URLs (they're already validated)
        const isProxyUrl = url.startsWith('/api/audio-proxy');
        
        if (!isProxyUrl) {
          // Test if the URL is accessible (only for direct URLs)
          console.log('🔍 Testing URL accessibility...');
          try {
            const response = await fetch(url, { method: 'HEAD' });
            console.log('🔍 URL test result:', {
              status: response.status,
              statusText: response.statusText,
              contentType: response.headers.get('content-type'),
              contentLength: response.headers.get('content-length')
            });
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
          } catch (fetchError) {
            console.error('🚨 URL is not accessible:', fetchError);
            audioRef.current.removeEventListener('error', onAudioError);
            throw new Error(`Audio file is not accessible: ${fetchError}`);
          }
        } else {
          console.log('⚡ Skipping URL test for proxy URL - using directly');
        }

        try {
          console.log('🎵 Audio source set, attempting to load...');
          await audioRef.current.load();
          console.log('🎵 Audio loaded successfully');
        } catch (loadError) {
          console.error('🚨 Error loading audio:', loadError);
          audioRef.current.removeEventListener('error', onAudioError);
          throw loadError;
        }

        // Wait for metadata to be loaded before playing
        const waitForMetadata = () => {
          return new Promise<void>((resolve) => {
            const audio = audioRef.current!;
            if (audio.readyState >= 1) { // HAVE_METADATA
              const audioDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
              console.log('✅ Metadata already loaded, audio duration:', audioDuration);
              setDuration(audioDuration);
              resolve();
            } else {
              const onLoaded = () => {
                const audioDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
                console.log('✅ Metadata loaded during play, audio duration:', audioDuration);
                setDuration(audioDuration);
                audio.removeEventListener('loadedmetadata', onLoaded);
                clearTimeout(timeoutId); // Clear timeout when metadata loads
                resolve();
              };
              
              const onError = (e: Event) => {
                console.error('🚨 Audio error event:', e);
                audio.removeEventListener('loadedmetadata', onLoaded);
                audio.removeEventListener('error', onError);
                clearTimeout(timeoutId);
                resolve(); // Continue anyway
              };
              
              audio.addEventListener('loadedmetadata', onLoaded);
              audio.addEventListener('error', onError);
              
              // Timeout fallback in case metadata doesn't load
              const timeoutId = setTimeout(() => {
                console.log('⚠️ Metadata load timeout, using track duration fallback:', track.duration);
                const fallbackDuration = track.duration && track.duration > 0 ? track.duration : 0;
                console.log('⚠️ Setting fallback duration:', fallbackDuration);
                setDuration(fallbackDuration);
                audio.removeEventListener('loadedmetadata', onLoaded);
                audio.removeEventListener('error', onError);
                resolve();
              }, 1500); // Reduced from 3000ms to 1500ms
            }
          });
        };

        await waitForMetadata();
        
        // Restore saved position for this track if it exists
        try {
          if (user) {
            // Only try to restore position if playback_state table exists
            // Skip for now to avoid errors in public tracks
            console.log('⏰ Skipping position restore for now (table may not exist)');
          } else {
            // Fallback to localStorage if not logged in
            const CACHE_KEY = "player_state_v1";
            const saved = localStorage.getItem(CACHE_KEY);
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed?.track?.id === track.id && parsed?.position > 0) {
                console.log('⏰ Restoring saved position from localStorage:', parsed.position);
                audioRef.current.currentTime = parsed.position;
                setCurrentTime(parsed.position);
              }
            }
          }
        } catch (error) {
          console.log('⚠️ Could not restore saved position:', error);
        }
        
        console.log('▶️ Attempting to play audio...');
        console.log('🔍 Audio element state before play:', {
          readyState: audioRef.current.readyState,
          networkState: audioRef.current.networkState,
          paused: audioRef.current.paused,
          ended: audioRef.current.ended,
          currentSrc: audioRef.current.currentSrc,
          error: audioRef.current.error
        });
        
        try {
          const playPromise = audioRef.current.play();
          await playPromise;
          setIsPlaying(true);
          console.log('✅ Started playing successfully');
        } catch (playError) {
          console.error('🚨 Error during play():', playError);
          console.error('🚨 Audio element state after error:', {
            readyState: audioRef.current?.readyState,
            networkState: audioRef.current?.networkState,
            error: audioRef.current?.error
          });
          throw playError;
        }
        
        // Double-check duration after play starts
        if (audioRef.current && (!duration || duration <= 0)) {
          const audioDuration = Number.isFinite(audioRef.current.duration) ? audioRef.current.duration : 0;
          if (audioDuration > 0) {
            console.log('🔄 Setting duration after play start:', audioDuration);
            setDuration(audioDuration);
          } else if (track.duration && track.duration > 0) {
            console.log('🔄 Using track duration as final fallback:', track.duration);
            setDuration(track.duration);
          }
        }
        
        // Save state immediately when playing starts
        saveLocalState({ track, position: 0 });
        
        // Also sync to DB immediately if user is logged in
        if (user) {
          upsertPlaybackState(track.id, 0).catch(() => {});
        }
      }
    } catch (error) {
      console.error('❌ Error playing track:', error);
      setIsPlaying(false);
    }
  }, [setQueue, saveLocalState, user, volume, duration]);

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

        // Wait for metadata to be loaded
        const waitForMetadata = () => {
          return new Promise<void>((resolve) => {
            const audio = audioRef.current!;
            if (audio.readyState >= 1) { // HAVE_METADATA
              const audioDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
              console.log('✅ Prime: Metadata already loaded, audio duration:', audioDuration);
              setDuration(audioDuration);
              resolve();
            } else {
              const onLoaded = () => {
                const audioDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
                console.log('✅ Prime: Metadata loaded, audio duration:', audioDuration);
                setDuration(audioDuration);
                audio.removeEventListener('loadedmetadata', onLoaded);
                clearTimeout(timeoutId); // Clear timeout when metadata loads
                resolve();
              };
              audio.addEventListener('loadedmetadata', onLoaded);
              // Timeout fallback
              const timeoutId = setTimeout(() => {
                console.log('⚠️ Prime: Metadata load timeout, using track duration fallback:', track.duration);
                const fallbackDuration = track.duration && track.duration > 0 ? track.duration : 0;
                console.log('⚠️ Prime: Setting fallback duration:', fallbackDuration);
                setDuration(fallbackDuration);
                audio.removeEventListener('loadedmetadata', onLoaded);
                resolve();
              }, 1500); // Reduced from 3000ms to 1500ms
            }
          });
        };

        await waitForMetadata();
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
          const currentPos = audioRef.current.currentTime;
          console.log('⏸️ Immediate save on pause:', currentPos);
          saveLocalState({ track: currentTrack, position: currentPos });
          if (user) {
            upsertPlaybackState(currentTrack.id, currentPos).catch(() => {});
          }
        }
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
        if (currentTrack) {
          const currentPos = audioRef.current.currentTime;
          console.log('▶️ Save on play resume:', currentPos);
          saveLocalState({ track: currentTrack, position: currentPos });
          if (user) {
            upsertPlaybackState(currentTrack.id, currentPos).catch(() => {});
          }
        }
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error);
      setIsPlaying(false);
    }
  }, [isPlaying, currentTrack, saveLocalState, user]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      if (currentTrack) {
        // Immediately save position when seeking - this is critical for resume
        console.log('⏭️ Immediate save on seek:', time);
        saveLocalState({ track: currentTrack, position: time });
        if (user) {
          upsertPlaybackState(currentTrack.id, time).catch(() => {});
        }
        // Update throttle timestamp to prevent duplicate saves immediately after seek
        lastSaveTimeRef.current = Date.now();
      }
    }
  }, [currentTrack, saveLocalState, user]);

  const next = useCallback(() => {
    if (!currentTrack || queue.length === 0) return;
    
    // Save current position before switching tracks
    if (audioRef.current && audioRef.current.currentTime > 0) {
      console.log('💾 Saving position before next track:', audioRef.current.currentTime);
      saveLocalState({ track: currentTrack, position: audioRef.current.currentTime });
      if (user) {
        upsertPlaybackState(currentTrack.id, audioRef.current.currentTime).catch(() => {});
      }
    }
    
    const i = queue.findIndex((t) => t.id === currentTrack.id);
    const nextTrack = queue[i + 1];
    if (nextTrack) {
      void play(nextTrack, queue);
      // persist snapshot at start of next track
      saveLocalState({ track: nextTrack, position: 0 });
    } else {
      setIsPlaying(false);
    }
  }, [currentTrack, queue, play, saveLocalState, user]);

  const previous = useCallback(() => {
    if (!currentTrack || queue.length === 0) return;
    
    // Save current position before switching tracks
    if (audioRef.current && audioRef.current.currentTime > 0) {
      console.log('💾 Saving position before previous track:', audioRef.current.currentTime);
      saveLocalState({ track: currentTrack, position: audioRef.current.currentTime });
      if (user) {
        upsertPlaybackState(currentTrack.id, audioRef.current.currentTime).catch(() => {});
      }
    }
    
    const i = queue.findIndex((t) => t.id === currentTrack.id);
    const prevTrack = queue[i - 1];
    if (prevTrack) void play(prevTrack, queue);
  }, [currentTrack, queue, play, saveLocalState, user]);

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
    stop
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
