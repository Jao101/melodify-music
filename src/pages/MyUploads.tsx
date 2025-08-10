import { useState, useRef, useEffect } from "react";
import { Upload, Music, ArrowLeft, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Track } from "@/hooks/useTracks";
import { TrackCard } from "@/components/music/TrackCard";
import { MusicPlayer } from "@/components/music/MusicPlayer";
import AddToPlaylistDialog from "@/components/playlists/AddToPlaylistDialog";
import { ListPlus } from "lucide-react";

export default function MyUploads() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [userTracks, setUserTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Track metadata for upload
  const [trackTitle, setTrackTitle] = useState("");
  const [trackArtist, setTrackArtist] = useState("");
  const [trackAlbum, setTrackAlbum] = useState("");
  const [trackGenre, setTrackGenre] = useState("");

  // Fetch user's uploaded tracks
  const fetchUserTracks = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('generated_by', user.id)
        .eq('user_uploaded', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserTracks(data || []);
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: "Tracks konnten nicht geladen werden: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load tracks on mount
  useEffect(() => {
    fetchUserTracks();
  }, [user]);

  // Validate file
  const validateFile = (file: File): string | null => {
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/ogg', 'audio/mp3'];
    const maxSize = 25 * 1024 * 1024; // 25MB
    
    if (!allowedTypes.includes(file.type)) {
      return "Dateityp nicht unterstützt. Erlaubt: MP3, WAV, FLAC, OGG";
    }
    
    if (file.size > maxSize) {
      return "Datei zu groß. Maximum: 25MB";
    }
    
    return null;
  };

  // Handle file selection and auto-fill title
  const handleFileSelect = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      toast({
        title: "Ungültige Datei",
        description: validationError,
        variant: "destructive",
      });
      return;
    }
    
    setSelectedFile(file);
    setUploadError(null);
    
    // Auto-fill title from filename (remove extension and clean up)
    const fileName = file.name;
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
    
    // Clean up filename: replace underscores/dashes with spaces, capitalize
    const cleanTitle = nameWithoutExt
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim();
    
    setTrackTitle(cleanTitle);
    
    // Try to extract artist from filename if it contains " - "
    if (cleanTitle.includes(' - ')) {
      const parts = cleanTitle.split(' - ');
      if (parts.length >= 2) {
        setTrackArtist(parts[0].trim());
        setTrackTitle(parts[1].trim());
      }
    }
  };

  const handleUpload = async () => {
    if (!user || !selectedFile || !trackTitle || !trackArtist) {
      toast({
        title: "Fehler",
        description: "Bitte fülle Titel und Künstler aus und wähle eine Datei",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    
    try {
      // Upload audio file with progress
      const audioFileName = `${user.id}/${Date.now()}-${selectedFile.name}`;
      setUploadProgress(25);
      
      const { data: audioData, error: audioError } = await supabase.storage
        .from('user-songs')
        .upload(audioFileName, selectedFile);

      if (audioError) throw audioError;
      setUploadProgress(50);

      // Get public URL for the audio file
      const { data: { publicUrl: audioUrl } } = supabase.storage
        .from('user-songs')
        .getPublicUrl(audioFileName);
      
      setUploadProgress(75);

      // Create track entry in database
      const { data: trackData, error: trackError } = await supabase
        .from('tracks')
        .insert({
          title: trackTitle,
          artist: trackArtist,
          album: trackAlbum || null,
          genre: trackGenre || null,
          duration: 0, // We'll need to calculate this client-side or set it later
          audio_url: audioUrl,
          generated_by: user.id,
          user_uploaded: true,
          is_ai_generated: false
        })
        .select()
        .single();

      if (trackError) throw trackError;
      setUploadProgress(100);

      toast({
        title: "Erfolg",
        description: "Song wurde erfolgreich hochgeladen!",
      });

      // Reset form
      setTrackTitle("");
      setTrackArtist("");
      setTrackAlbum("");
      setTrackGenre("");
      setSelectedFile(null);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Refresh tracks list
      fetchUserTracks();

    } catch (error: any) {
      const errorMessage = "Upload fehlgeschlagen: " + error.message;
      setUploadError(errorMessage);
      toast({
        title: "Fehler",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const retryUpload = () => {
    setUploadError(null);
    handleUpload();
  };

  const handleDeleteTrack = async (trackId: string) => {
    try {
      const { error } = await supabase
        .from('tracks')
        .delete()
        .eq('id', trackId)
        .eq('generated_by', user?.id);

      if (error) throw error;

      toast({
        title: "Erfolg",
        description: "Song wurde gelöscht",
      });

      fetchUserTracks();
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: "Löschen fehlgeschlagen: " + error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="p-6 bg-gradient-to-b from-primary/10 to-background">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="hover:bg-secondary/70"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Uploads</h1>
            <p className="text-muted-foreground mt-1">
              {userTracks.length} eigene Songs
            </p>
          </div>
        </div>

        {/* Upload Section */}
        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Song hochladen
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input
              placeholder="Song Titel *"
              value={trackTitle}
              onChange={(e) => setTrackTitle(e.target.value)}
              required
            />
            <Input
              placeholder="Künstler *"
              value={trackArtist}
              onChange={(e) => setTrackArtist(e.target.value)}
              required
            />
            <Input
              placeholder="Album (optional)"
              value={trackAlbum}
              onChange={(e) => setTrackAlbum(e.target.value)}
            />
            <Input
              placeholder="Genre (optional)"
              value={trackGenre}
              onChange={(e) => setTrackGenre(e.target.value)}
            />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/mpeg,audio/wav,audio/flac,audio/ogg,audio/mp3"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Music className="h-4 w-4" />
                {selectedFile ? selectedFile.name : "Audio-Datei auswählen"}
              </Button>
              <span className="text-sm text-muted-foreground">
                Unterstützte Formate: MP3, WAV, FLAC, OGG
              </span>
            </div>
            
            {selectedFile && (
              <div className="space-y-4 p-4 bg-secondary/20 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium">Ausgewählte Datei:</p>
                    <p className="text-sm text-muted-foreground">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {uploadError && (
                      <Button
                        onClick={retryUpload}
                        variant="outline"
                        className="flex items-center gap-2"
                        disabled={uploading}
                      >
                        Erneut versuchen
                      </Button>
                    )}
                    <Button
                      onClick={handleUpload}
                      disabled={uploading || !trackTitle || !trackArtist}
                      className="flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label="Song hochladen"
                    >
                      <Upload className="h-4 w-4" />
                      {uploading ? "Uploading..." : "Song hochladen"}
                    </Button>
                  </div>
                </div>
                
                {uploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Upload läuft...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
                
                {uploadError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive">{uploadError}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Tracks List */}
      <div className="p-6">
        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Lade Songs...</p>
          </div>
        ) : userTracks.length === 0 ? (
          <div className="text-center py-12">
            <Music className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Noch keine eigenen Songs</h3>
            <p className="text-muted-foreground">
              Lade deinen ersten Song hoch, um loszulegen.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {userTracks.map((track) => (
              <div key={track.id} className="relative group">
                <TrackCard
                  track={{
                    id: track.id,
                    title: track.title,
                    artist: track.artist,
                    album: track.album || "",
                    duration: track.duration,
                    imageUrl: track.image_url || undefined
                  }}
                  onPlay={() => {
                    setCurrentTrack(track);
                    setIsPlaying(true);
                  }}
                  isCurrentTrack={currentTrack?.id === track.id}
                  isPlaying={isPlaying && currentTrack?.id === track.id}
                />
                <AddToPlaylistDialog
                  trackId={track.id}
                  trigger={
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute top-2 right-12 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                      title="Zur Playlist hinzufügen"
                    >
                      <ListPlus className="h-4 w-4" />
                    </Button>
                  }
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                  onClick={() => handleDeleteTrack(track.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Music Player */}
      {currentTrack && (
        <MusicPlayer
          currentTrack={{
            id: currentTrack.id,
            title: currentTrack.title,
            artist: currentTrack.artist,
            album: currentTrack.album || "",
            duration: currentTrack.duration,
            audioUrl: currentTrack.audio_url || undefined,
            imageUrl: currentTrack.image_url || undefined
          }}
          isPlaying={isPlaying}
          onPlayPause={() => setIsPlaying(!isPlaying)}
          onNext={() => {
            const currentIndex = userTracks.findIndex(t => t.id === currentTrack.id);
            const nextTrack = userTracks[currentIndex + 1];
            if (nextTrack) {
              setCurrentTrack(nextTrack);
              setIsPlaying(true);
            }
          }}
          onPrevious={() => {
            const currentIndex = userTracks.findIndex(t => t.id === currentTrack.id);
            const prevTrack = userTracks[currentIndex - 1];
            if (prevTrack) {
              setCurrentTrack(prevTrack);
              setIsPlaying(true);
            }
          }}
          onSeek={(time) => {}}
          currentTime={0}
          volume={75}
          onVolumeChange={() => {}}
        />
      )}
    </div>
  );
}