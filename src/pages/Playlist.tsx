import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Music, Play, Trash2, Shuffle } from "lucide-react";
import { deletePlaylist } from "@/services/playlistService";
import { useToast } from "@/hooks/use-toast";
import { isPlayableTrack } from "@/hooks/useAudioPlayer";
import { usePlaylist } from "@/hooks/usePlaylist";
import { usePlaylistTracks } from "@/hooks/usePlaylistTracks";
import { TrackCard } from "@/components/music/TrackCard";
import { useAuth } from "@/contexts/AuthContext";

export default function Playlist() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  
  const { playlist, loading: playlistLoading, error: playlistError } = usePlaylist(id!);
  const { tracks, loading: tracksLoading, error: tracksError, removeTrack, refetch } = usePlaylistTracks(id);
  
  const loading = playlistLoading || tracksLoading;
  const error = playlistError || tracksError;

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const isOwner = user?.id === playlist?.owner_id;

  const filtered = tracks
    .filter((pt) => isPlayableTrack(pt.track))
    .filter((pt) =>
      [pt.track.title, pt.track.artist, pt.track.album ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase())
    );

  const handleRemoveTrack = async (trackId: string) => {
    if (!id || !isOwner) return;
    try {
      await removeTrack(id, trackId);
      toast({ title: "Entfernt", description: "Track wurde aus der Playlist entfernt." });
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="p-6 bg-gradient-to-b from-primary/10 to-background">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/library')}
              className="hover:bg-secondary/70"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{playlist?.name || 'Playlist'}</h1>
              {playlist?.description && (
                <p className="text-muted-foreground mt-1">{playlist.description}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                {playlist?.owner_display_name && (
                  <span>Von {playlist.owner_display_name}</span>
                )}
                <span>•</span>
                <span>{playlist?.track_count || 0} Titel</span>
                {playlist?.total_duration && (
                  <>
                    <span>•</span>
                    <span>{formatDuration(playlist.total_duration)}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              className="rounded-full h-10 px-5 focus-visible:ring-2 focus-visible:ring-primary" 
              disabled={filtered.length === 0}
              aria-label="Alle Titel abspielen"
            >
              <Play className="h-4 w-4 mr-2" /> Play All
            </Button>
            <Button 
              variant="outline" 
              className="rounded-full h-10 px-5 focus-visible:ring-2 focus-visible:ring-primary" 
              disabled={filtered.length === 0}
              aria-label="Zufällige Wiedergabe"
            >
              <Shuffle className="h-4 w-4 mr-2" /> Shuffle
            </Button>
            {playlist && isOwner && (
              <Button
                variant="destructive"
                className="h-10 px-5 focus-visible:ring-2 focus-visible:ring-destructive"
                onClick={async () => {
                  if (!id || !playlist) return;
                  const confirmed = window.confirm(`Playlist "${playlist.name}" löschen? Diese Aktion kann nicht rückgängig gemacht werden.`);
                  if (!confirmed) return;
                  try {
                    await deletePlaylist(id);
                    toast({ title: "Gelöscht", description: `"${playlist.name}" wurde gelöscht.`});
                    navigate('/library');
                  } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : String(err);
                    toast({ title: "Fehler beim Löschen", description: msg, variant: "destructive" });
                  }
                }}
                aria-label="Playlist löschen"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Löschen
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Input
            placeholder="In der Playlist suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-background/50 backdrop-blur-sm"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pb-24 overflow-auto">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Playlist wird geladen...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-destructive">Fehler: {error}</p>
          </div>
        ) : !playlist ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Playlist nicht gefunden.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Music className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Keine Titel</h3>
            <p className="text-muted-foreground">Diese Playlist hat noch keine Titel oder passt nicht zur Suche.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((pt) => (
              <TrackCard
                key={`${pt.track.id}-${pt.position}`}
                track={{
                  id: pt.track.id,
                  title: pt.track.title,
                  artist: pt.track.artist,
                  album: pt.track.album || "",
                  duration: pt.track.duration,
                  imageUrl: pt.track.image_url || undefined,
                  isAI: pt.track.is_ai_generated || false
                }}
                onPlay={() => {
                  // TODO: Implement play functionality
                }}
                onRemove={() => handleRemoveTrack(pt.track.id)}
                showRemove={isOwner}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
