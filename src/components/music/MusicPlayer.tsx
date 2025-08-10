import { useState, useRef, useEffect } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";

interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  audioUrl?: string;
  imageUrl?: string;
}

interface MusicPlayerProps {
  currentTrack?: Track;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (time: number) => void;
  currentTime: number;
  volume: number;
  onVolumeChange: (volume: number) => void;
}

export function MusicPlayer({
  currentTrack,
  isPlaying,
  onPlayPause,
  onNext,
  onPrevious,
  onSeek,
  currentTime,
  volume,
  onVolumeChange,
}: MusicPlayerProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(50);

  // Handle mute/unmute
  const toggleMute = () => {
    if (isMuted) {
      onVolumeChange(prevVolume);
      setIsMuted(false);
    } else {
      setPrevVolume(volume);
      onVolumeChange(0);
      setIsMuted(true);
    }
  };

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = currentTrack && currentTrack.duration > 0
    ? Math.min(100, Math.max(0, (currentTime / currentTrack.duration) * 100))
    : 0;

  // Debug duration display only when duration changes
  useEffect(() => {
    if (currentTrack) {
      console.log('🎵 MusicPlayer Duration Update:', {
        trackTitle: currentTrack.title,
        duration: currentTrack.duration,
        currentTime,
        isValidDuration: currentTrack.duration > 0,
        progressPercentage
      });
    }
  }, [currentTrack?.duration, currentTrack?.title]);

  if (!currentTrack) {
    return (
      <div
        className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border p-4"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-between gap-4 max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="h-14 w-14 rounded-md bg-muted flex items-center justify-center">
              <Music className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-center text-muted-foreground">
                <span>Select a song to start playing</span>
              </div>
            </div>
          </div>
          
          {/* Empty controls section to match layout */}
          <div className="flex flex-col items-center gap-2 flex-1 max-w-md">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8"></div> {/* Skip back placeholder */}
              <div className="w-12 h-12"></div> {/* Play button placeholder */}
              <div className="w-8 h-8"></div> {/* Skip forward placeholder */}
            </div>
            <div className="flex items-center gap-2 w-full">
              <span className="text-xs text-muted-foreground w-10 text-right">0:00</span>
              <div className="flex-1 h-2 bg-secondary rounded-full"></div>
              <span className="text-xs text-muted-foreground w-10">0:00</span>
            </div>
          </div>
          
          {/* Volume section placeholder */}
          <div className="flex items-center gap-2 flex-1 justify-end">
            <div className="w-8 h-8"></div> {/* Volume button placeholder */}
            <div className="w-24 h-2 bg-secondary rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Progress Bar - Enhanced with hover effect */}
      <div className="w-full bg-audio-background h-1 cursor-pointer group relative" onClick={(e) => {
        if (!currentTrack.duration || currentTrack.duration <= 0) return; // Don't allow seeking if no duration
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        onSeek(percent * currentTrack.duration);
      }}>
        <div 
          className="h-full bg-audio-progress relative transition-all duration-200 group-hover:bg-primary"
          style={{ width: `${progressPercentage}%` }}
        >
          {/* Draggable knob - appears on hover, only if duration is valid */}
          {currentTrack.duration > 0 && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-3 w-3 bg-primary rounded-full opacity-0 group-hover:opacity-100 shadow-sm -mr-1.5"></div>
          )}
        </div>
      </div>

  <div className="flex items-center justify-between p-4 gap-4 max-w-screen-2xl mx-auto">
        {/* Track Info */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="h-14 w-14 rounded-md bg-muted flex items-center justify-center overflow-hidden shadow-md hover:shadow-lg transition-shadow">
            {currentTrack.imageUrl ? (
              <img 
                src={currentTrack.imageUrl} 
                alt={currentTrack.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center">
                <Music className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-sm truncate text-foreground">{currentTrack.title}</h4>
            <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
            
            {/* Now playing indicator */}
            {isPlaying && (
              <div className="now-playing-indicator mt-1">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </div>
            )}
          </div>
        </div>

        {/* Player Controls - Enhanced UI */}
        <div className="flex flex-col items-center gap-2 flex-1 max-w-md">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="audio-button w-8 h-8 hover:bg-secondary/70"
              onClick={onPrevious}
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className={`audio-button w-12 h-12 bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 transition-transform ${isPlaying ? 'animate-pulse-glow' : ''}`}
              onClick={onPlayPause}
            >
              {isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6 ml-0.5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="audio-button w-8 h-8 hover:bg-secondary/70"
              onClick={onNext}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 w-full">
            <span className="text-xs text-muted-foreground w-10 text-right">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[currentTime]}
              max={Math.max(currentTrack.duration, 1)} // Prevent division by zero
              step={1}
              className="flex-1"
              disabled={!currentTrack.duration || currentTrack.duration <= 0}
              onValueChange={(value) => onSeek(value[0])}
            />
            <span className="text-xs text-muted-foreground w-10">
              {currentTrack.duration > 0 ? formatTime(currentTrack.duration) : "--:--"}
            </span>
          </div>
        </div>

        {/* Volume Control - Enhanced with mute toggle */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="audio-button w-8 h-8 hover:bg-secondary/70"
            onClick={toggleMute}
          >
            {volume === 0 || isMuted ? (
              <VolumeX className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Volume2 className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
          <div>
            <Slider
              value={[volume]}
              max={100}
              step={1}
              className="w-24"
              onValueChange={(value) => {
                onVolumeChange(value[0]);
                if (value[0] > 0) setIsMuted(false);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}