import { Play, Pause, Music, MoreHorizontal, ListPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LikeButton } from "./LikeButton";
import AddToPlaylistDialog from "@/components/playlists/AddToPlaylistDialog";
import { useState } from "react";

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
  onRemove?: () => void;
  showRemove?: boolean;
}

export function TrackCard({ 
  track, 
  isPlaying = false, 
  isCurrentTrack = false,
  onPlay,
  onRemove,
  showRemove = false
}: TrackCardProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className={`music-card group hover:bg-secondary/50 transition-all duration-300 ${
      isCurrentTrack ? 'ring-1 ring-primary/50' : ''
    }`}>
      <div className="flex items-center gap-4 p-4">
        {/* Album Art with Cover Effect */}
        <div className="relative h-12 w-12 rounded-md bg-muted flex items-center justify-center overflow-hidden group-hover:shadow-md transition-all">
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
          
          {/* Play/Pause Overlay with improved hover effect */}
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="audio-button w-8 h-8 bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-110 transition-transform"
              onClick={onPlay}
              aria-label={isPlaying && isCurrentTrack ? "Pausieren" : "Abspielen"}
            >
              {isPlaying && isCurrentTrack ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4 ml-0.5" />
              )}
            </Button>
          </div>
        </div>

        {/* Track Info with Now Playing Indicator */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`font-medium truncate ${
              isCurrentTrack ? 'text-primary' : 'text-foreground'
            }`}>
              {track.title}
            </h3>
            {track.isAI && (
              <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full font-medium">
                AI
              </span>
            )}
            
            {/* Now Playing Indicator */}
            {isPlaying && isCurrentTrack && (
              <div className="now-playing-indicator ml-1">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
          <p className="text-xs text-muted-foreground truncate">{track.album}</p>
        </div>

        {/* Duration and Actions */}
        <div className="flex items-center gap-2">
          <LikeButton trackId={track.id} size="sm" />
          
          {showRemove && onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
              onClick={onRemove}
              aria-label="Aus Playlist entfernen"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Mehr Optionen"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowAddDialog(true)}>
                <ListPlus className="h-4 w-4 mr-2" />
                Zur Playlist hinzufügen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="text-sm text-muted-foreground min-w-[3rem] text-right">
            {formatDuration(track.duration)}
          </div>
        </div>
        
        <AddToPlaylistDialog
          trackId={track.id}
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
        />
      </div>
    </Card>
  );
}