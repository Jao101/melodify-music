import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Music, Play, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { deletePlaylist } from "@/services/playlistService";
import { useToast } from "@/components/ui/use-toast";

type PlaylistRow = Tables<'playlists'>;
type TrackRow = Tables<'tracks'>;

type PlaylistTrack = {
  position: number;
  added_at: string;
  track: TrackRow;
};

export default function Playlist() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [playlist, setPlaylist] = useState<PlaylistRow | null>(null);
  const [tracks, setTracks] = useState<PlaylistTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);

        const [playlistRes, tracksRes] = await Promise.all([
          supabase.from('playlists').select('*').eq('id', id).maybeSingle(),
          supabase
            .from('playlist_tracks')
            .select('position, added_at, track:tracks(*)')
            .eq('playlist_id', id)
            .order('position', { ascending: true }),
        ]);

        if (playlistRes.error) throw playlistRes.error;
        if (tracksRes.error) throw tracksRes.error;

        setPlaylist(playlistRes.data as PlaylistRow | null);
        setTracks((tracksRes.data as any as PlaylistTrack[]) || []);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const filtered = tracks.filter((pt) =>
    [pt.track.title, pt.track.artist, pt.track.album ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

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
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button className="rounded-full h-10 px-5" disabled={filtered.length === 0}>
              <Play className="h-4 w-4 mr-2" /> Play All
            </Button>
            {playlist && (
              <Button
                variant="destructive"
                className="h-10 px-5"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((pt) => (
              <Card key={`${pt.track.id}-${pt.position}`} className="p-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded bg-secondary/30 flex items-center justify-center overflow-hidden">
                    {/* Placeholder cover - could use pt.track.image_url when available */}
                    <Music className="h-6 w-6 text-foreground/80" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{pt.track.title}</div>
                    <div className="text-sm text-muted-foreground truncate">{pt.track.artist}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
