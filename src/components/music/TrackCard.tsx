import { Play, Pause, MoreHorizontal, Heart, Plus, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  imageUrl?: string;
  isAI?: boolean;
}

interface TrackCardProps {
  track: Track;
  isPlaying?: boolean;
  isCurrentTrack?: boolean;
  onPlay: () => void;
  onAddToPlaylist?: () => void;
  onLike?: () => void;
  isLiked?: boolean;
}

export function TrackCard({ 
  track, 
  isPlaying = false, 
  isCurrentTrack = false,
  onPlay, 
  onAddToPlaylist,
  onLike,
  isLiked = false 
}: TrackCardProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className={`music-card group hover:bg-secondary/50 transition-all duration-300 ${
      isCurrentTrack ? 'ring-2 ring-primary' : ''
    }`}>
      <div className="flex items-center gap-4 p-4">
        {/* Album Art */}
        <div className="relative h-12 w-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
          {track.imageUrl ? (
            <img 
              src={track.imageUrl} 
              alt={track.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">
                {track.title.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          
          {/* Play/Pause Overlay */}
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="audio-button w-8 h-8 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={onPlay}
            >
              {isPlaying && isCurrentTrack ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4 ml-0.5" />
              )}
            </Button>
          </div>
        </div>

        {/* Track Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`font-medium truncate ${
              isCurrentTrack ? 'text-primary' : 'text-foreground'
            }`}>
              {track.title}
            </h3>
            {track.isAI && (
              <span className="px-2 py-0.5 bg-accent text-accent-foreground text-xs rounded-full font-medium">
                AI
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
          <p className="text-xs text-muted-foreground truncate">{track.album}</p>
        </div>

        {/* Duration */}
        <div className="text-sm text-muted-foreground">
          {formatDuration(track.duration)}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8"
            onClick={onLike}
          >
            <Heart 
              className={`h-4 w-4 ${isLiked ? 'fill-accent text-accent' : 'text-muted-foreground'}`} 
            />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="w-8 h-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onAddToPlaylist}>
                <Plus className="h-4 w-4 mr-2" />
                Add to Playlist
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Heart className="h-4 w-4 mr-2" />
                {isLiked ? 'Remove from Liked' : 'Add to Liked'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}