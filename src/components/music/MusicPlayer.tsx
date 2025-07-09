import { useState, useRef, useEffect } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

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
  const [prevVolume, setPrevVolume] = useState(75);

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
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = currentTrack 
    ? (currentTime / currentTrack.duration) * 100 
    : 0;

  if (!currentTrack) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border p-4">
        <div className="flex items-center justify-center text-muted-foreground">
          <Music className="h-5 w-5 mr-2" />
          <span>Select a song to start playing</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border animate-slide-up">
      {/* Progress Bar - Enhanced with hover effect */}
      <div className="w-full bg-audio-background h-1 cursor-pointer group relative" onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        onSeek(percent * currentTrack.duration);
      }}>
        <div 
          className="h-full bg-audio-progress relative transition-all duration-200 group-hover:bg-primary"
          style={{ width: `${progressPercentage}%` }}
        >
          {/* Draggable knob - appears on hover */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 h-3 w-3 bg-primary rounded-full opacity-0 group-hover:opacity-100 shadow-sm -mr-1.5"></div>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 max-w-screen-2xl mx-auto">
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
              className="audio-button w-12 h-12 bg-primary text-primary-foreground hover:bg-primary/90 animate-pulse-glow hover:scale-105 transition-transform"
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
              max={currentTrack.duration}
              step={1}
              className="flex-1"
              onValueChange={(value) => onSeek(value[0])}
            />
            <span className="text-xs text-muted-foreground w-10">
              {formatTime(currentTrack.duration)}
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
  );
}