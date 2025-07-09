import { useState, useRef, useEffect } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, Shuffle, Repeat, Heart, Music } from "lucide-react";
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
  const [isLiked, setIsLiked] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');

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
      {/* Progress Bar */}
      <div className="w-full bg-audio-background h-1 cursor-pointer group">
        <div 
          className="h-full bg-audio-progress transition-all duration-200 group-hover:bg-primary"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      <div className="flex items-center justify-between p-4 max-w-screen-2xl mx-auto">
        {/* Track Info */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
            {currentTrack.imageUrl ? (
              <img 
                src={currentTrack.imageUrl} 
                alt={currentTrack.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <Music className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-sm truncate">{currentTrack.title}</h4>
            <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="audio-button w-8 h-8"
            onClick={() => setIsLiked(!isLiked)}
          >
            <Heart 
              className={`h-4 w-4 ${isLiked ? 'fill-accent text-accent' : 'text-muted-foreground'}`} 
            />
          </Button>
        </div>

        {/* Player Controls */}
        <div className="flex flex-col items-center gap-2 flex-1 max-w-md">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="audio-button w-8 h-8"
              onClick={() => setIsShuffled(!isShuffled)}
            >
              <Shuffle 
                className={`h-4 w-4 ${isShuffled ? 'text-accent' : 'text-muted-foreground'}`} 
              />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="audio-button w-8 h-8"
              onClick={onPrevious}
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="audio-button w-12 h-12 bg-primary text-primary-foreground hover:bg-primary/90 animate-pulse-glow"
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
              className="audio-button w-8 h-8"
              onClick={onNext}
            >
              <SkipForward className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="audio-button w-8 h-8"
              onClick={() => {
                const modes: Array<'off' | 'all' | 'one'> = ['off', 'all', 'one'];
                const currentIndex = modes.indexOf(repeatMode);
                setRepeatMode(modes[(currentIndex + 1) % modes.length]);
              }}
            >
              <Repeat 
                className={`h-4 w-4 ${repeatMode !== 'off' ? 'text-accent' : 'text-muted-foreground'}`} 
              />
              {repeatMode === 'one' && (
                <span className="absolute -top-1 -right-1 text-xs text-accent">1</span>
              )}
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

        {/* Volume Control */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          <Slider
            value={[volume]}
            max={100}
            step={1}
            className="w-24"
            onValueChange={(value) => onVolumeChange(value[0])}
          />
        </div>
      </div>
    </div>
  );
}