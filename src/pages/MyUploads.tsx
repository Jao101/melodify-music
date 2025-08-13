import { useState, useRef, useEffect, useCallback } from "react";
import { Upload, Music, ArrowLeft, Trash2, Globe, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Track } from "@/hooks/useTracks";
import { TrackCard } from "@/components/music/TrackCard";
import AddToPlaylistDialog from "@/components/playlists/AddToPlaylistDialog";
import { MetadataEnhancerButton } from "@/components/music/MetadataEnhancerButton";
import { ListPlus } from "lucide-react";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { getUploadsPlaylistName } from "@/services/playlistService";
import { ensureUploadsPlaylist, addTrackToPlaylist } from "@/services/playlistService";
import { NextcloudService } from "@/services/nextcloudService";
// removed duplicate import above

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
  const { currentTrack, isPlaying, play, setQueue } = useAudioPlayer();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  // Nextcloud status tracking
  const [nextcloudStatus, setNextcloudStatus] = useState<string>("");
  
  // Track metadata for upload
  const [trackTitle, setTrackTitle] = useState("");
  const [trackArtist, setTrackArtist] = useState("");
  const [trackAlbum, setTrackAlbum] = useState("");
  const [trackGenre, setTrackGenre] = useState("");

  // Fetch user's uploaded tracks
  const fetchUserTracks = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .or(`user_id.eq.${user.id},generated_by.eq.${user.id}`)
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
  }, [toast, user]);

  // Load tracks on mount
  useEffect(() => {
    fetchUserTracks();
  }, [fetchUserTracks]);

  // Reconcile Nextcloud files on reload: add any files not yet in DB
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const resp = await fetch(`/api/nextcloud/list?userId=${encodeURIComponent(user.id)}`);
        if (!resp.ok) return; // silently ignore
        const data = await resp.json();
        if (!data?.success || !Array.isArray(data.files)) return;

        // Build a set of known filenames from current list
        const known = new Set((userTracks || []).map(t => (t as any)?.metadata?.nextcloud_path));

        const missing = data.files.filter((f: any) => {
          const path = (f?.path as string) || '';
          // our metadata stores nextcloud_path as userId/filename
          const pathKey = path.replace(/^\/audio\//, '');
          return pathKey && !known.has(pathKey);
        });

        if (missing.length === 0) return;

        // Insert minimal track rows for missing files
        for (const f of missing) {
          try {
            const filename = (f.filename as string) || 'Unknown';
            const title = filename.replace(/\.[^.]+$/, '');
            const artist = user.email || 'Unknown Artist';
            const downloadUrl = f.downloadUrl as string | undefined;

            if (!downloadUrl) continue; // can't play without public link

            await supabase
              .from('tracks')
              .insert({
                title,
                artist,
                album: null,
                genre: null,
                duration: 0,
                audio_url: downloadUrl,
                generated_by: user.id,
                user_uploaded: true,
                is_ai_generated: false,
                metadata: {
                  storage_provider: 'nextcloud',
                  original_filename: filename,
                  nextcloud_path: `${user.id}/${filename}`
                },
              });
          } catch (e) {
            // continue with next
          }
        }

        // Refresh list
        await fetchUserTracks();
      } catch (e) {
        // ignore reconciliation errors
      }
    })();
  }, [user, fetchUserTracks]);

  // Toggle track public status
  const toggleTrackPublic = async (track: Track, isPublic: boolean) => {
    if (!user || ((track as any).user_id !== user.id && (track as any).generated_by !== user.id)) {
      toast({
        title: "Fehler",
        description: "Du kannst nur deine eigenen Tracks ändern",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('tracks')
        .update({ is_public: isPublic })
        .eq('id', track.id);

      if (error) throw error;

      toast({
        title: "Erfolg",
        description: `Track ${isPublic ? 'öffentlich gemacht' : 'privat gemacht'}`,
      });

      // Refresh tracks
      await fetchUserTracks();
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: "Status konnte nicht geändert werden: " + error.message,
        variant: "destructive",
      });
    }
  };
  
  const handleTrackPlay = async (track: Track) => {
    try {
      setQueue(userTracks as any);
      await play(track as any, userTracks as any);
    } catch (e: any) {
      toast({ title: 'Fehler', description: e?.message || String(e), variant: 'destructive' });
    }
  };

  // controls handled by global player at app root

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
  const handleFilesSelected = (filesLike: FileList | File[]) => {
    const files = Array.from(filesLike);
    const valid: File[] = [];
    files.forEach((file) => {
      const err = validateFile(file);
      if (err) {
        toast({ title: "Ungültige Datei", description: `${file.name}: ${err}` , variant: "destructive" });
      } else {
        valid.push(file);
      }
    });
    if (valid.length === 0) return;
    setSelectedFiles(valid);
    setUploadError(null);

    // For single selection, keep auto-fill behavior
    if (valid.length === 1) {
      const file = valid[0];
      const fileName = file.name;
      const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
      const cleanTitle = nameWithoutExt
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase())
        .trim();
      setTrackTitle(cleanTitle);
      if (cleanTitle.includes(' - ')) {
        const parts = cleanTitle.split(' - ');
        if (parts.length >= 2) {
          setTrackArtist(parts[0].trim());
          setTrackTitle(parts[1].trim());
        }
      }
    } else {
      // For multi, clear manual fields to avoid confusion
      setTrackTitle("");
      setTrackArtist("");
      // album/genre optional — keep user-entered values to apply to all if provided
    }
  };

  const handleUpload = async () => {
    if (!user) {
      toast({ title: "Fehler", description: "Nicht angemeldet.", variant: "destructive" });
      return;
    }

    if (selectedFiles.length === 0) {
      toast({ title: "Fehler", description: "Bitte wähle mindestens eine Datei aus.", variant: "destructive" });
      return;
    }

    // Single-file path preserves existing validation for title/artist
    if (selectedFiles.length === 1 && (!trackTitle || !trackArtist)) {
      toast({
        title: "Fehler",
        description: "Bitte fülle Titel und Künstler aus oder wähle mehrere Dateien für Auto-Erkennung.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    const total = selectedFiles.length;
    let success = 0;
    let failed = 0;

  const uploadOne = async (file: File, index: number) => {
      // Derive metadata per file if multi, or use manual for single
      let title = trackTitle;
      let artist = trackArtist;
      if (total > 1) {
        const base = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        const clean = base.replace(/[-_]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()).trim();
        if (clean.includes(' - ')) {
          const parts = clean.split(' - ');
          if (parts.length >= 2) {
            artist = parts[0].trim();
            title = parts.slice(1).join(' - ').trim();
          } else {
            title = clean;
            artist = artist || "Unknown Artist";
          }
        } else {
          title = clean;
          artist = artist || "Unknown Artist";
        }
      }

      try {
        const audioFileName = `${user.id}_${Date.now()}_${Math.random().toString(36).slice(2)}_${file.name}`;
        let audioUrl = '';
        
        // Upload ONLY to Nextcloud (Supabase Storage disabled)
        setNextcloudStatus(`📤 Uploading ${file.name} to Nextcloud...`);
        
        try {
          const nextcloud = new NextcloudService();
          const result = await nextcloud.uploadAndShare(
            file,
            audioFileName.replace(/[\/\\:*?"<>|]/g, '_'), // Clean filename for Nextcloud
            (progress) => {
              setUploadProgress(Math.min(99, Math.round(((index) / total) * 100 + (progress * 0.8) / total)));
            },
            user.id
          );
          
          if (!result.success) {
            throw new Error(`Nextcloud upload failed: ${result.error}`);
          }
          
          audioUrl = result.downloadUrl!;
          setNextcloudStatus(`✅ Successfully uploaded to Nextcloud: ${file.name}`);
          
        } catch (nextcloudError) {
          setNextcloudStatus(`❌ Nextcloud upload failed: ${nextcloudError}`);
          throw new Error(`File upload failed: ${nextcloudError}`);
        }

        setUploadProgress(Math.min(99, Math.round(((index) / total) * 100 + 85)));

        setUploadProgress(Math.min(99, Math.round(((index) / total) * 100 + 60)));
        const { data: inserted, error: trackError } = await (supabase as any)
          .from('tracks')
          .insert({
            title,
            artist,
            album: trackAlbum || null,
            genre: trackGenre || null,
            duration: 0,
            audio_url: audioUrl,
            generated_by: user.id,
            user_uploaded: true,
            is_ai_generated: false,
            metadata: { 
              storage_provider: 'nextcloud',
              original_filename: file.name,
              // Store nested path: userId/filename for per-user folder layout
              nextcloud_path: `${user.id}/${audioFileName.replace(/[\/\\:*?"<>|]/g, '_')}`
            },
          })
          .select('id')
          .single();
        if (trackError) throw trackError;

        // Ensure uploads playlist exists and add the new track to it
        try {
          const pl = await ensureUploadsPlaylist(user.id);
          await addTrackToPlaylist(pl.id, (inserted as any).id);
        } catch (plErr) {
          console.warn('Failed to attach track to uploads playlist', plErr);
        }
        success += 1;
      } catch (e: any) {
        failed += 1;
        // Surface first failure immediately but continue
        setUploadError(e?.message || String(e));
      } finally {
        setUploadProgress(Math.round(((index + 1) / total) * 100));
      }
    };

    for (let i = 0; i < total; i++) {
      // sequential to avoid rate limits
      await uploadOne(selectedFiles[i], i);
    }

    setUploadProgress(100);

    if (success > 0) {
      toast({ title: "Fertig", description: `${success} von ${total} Uploads erfolgreich${failed ? `, ${failed} fehlgeschlagen` : ''}.` });
    } else {
      toast({ title: "Fehler", description: `Alle Uploads fehlgeschlagen (${failed}/${total}).`, variant: "destructive" });
    }

    // Reset form
    setTrackTitle("");
    setTrackArtist("");
    setTrackAlbum("");
    setTrackGenre("");
    setSelectedFiles([]);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";

    // Refresh list
    fetchUserTracks();

    setUploading(false);
  };

  const retryUpload = () => {
    setUploadError(null);
    handleUpload();
  };

  const handleDeleteTrack = async (trackId: string) => {
    try {
      // First, get the track data - try all possible URL column names
      const { data: track, error: fetchError } = await supabase
        .from('tracks')
        .select('*')
        .eq('id', trackId)
        .eq('generated_by', user?.id)
        .single();

      if (fetchError) throw fetchError;

      console.log('🔍 Full track data for deletion:', track);
      
      // Get the file URL (check both possible column names)
      const fileUrl = (track as any).audio_url || track.file_url;
      
      console.log('🔍 Extracted file URL:', fileUrl);

      // Delete from all playlists first
      const { error: playlistError } = await (supabase as any)
        .from('playlist_tracks')
        .delete()
        .eq('track_id', trackId);

      if (playlistError) throw playlistError;

      // Delete from liked tracks
      const { error: likedError } = await supabase
        .from('liked_tracks')
        .delete()
        .eq('track_id', trackId);

      if (likedError) throw likedError;

      // Clear playback state if this track is currently being played
      const { error: playbackError } = await (supabase as any)
        .from('playback_state')
        .update({ track_id: null, position: 0 })
        .eq('track_id', trackId);

      if (playbackError) {
        console.warn('Failed to clear playback state:', playbackError);
        // Don't throw here, continue with deletion
      }

      // Delete file from Nextcloud using WebDAV HTTP DELETE
      if (fileUrl) {
        try {
          console.log('🗑️ Attempting WebDAV DELETE via API (by URL):', fileUrl);
          const url = new URL(fileUrl);
          const pathname = url.pathname || '';
          // Try to extract filename used at upload (we stored metadata.nextcloud_path)
          const nextcloudPath = (track as any)?.metadata?.nextcloud_path as string | undefined;

          let deleteOk = false;

          if (nextcloudPath) {
            // Prefer direct filename endpoint if available
            const resp = await fetch(`/api/nextcloud/delete/${encodeURIComponent(nextcloudPath)}`, {
              method: 'DELETE'
            });
            if (resp.ok) {
              const result = await resp.json();
              console.log('✅ Nextcloud deletion by filename result:', result);
              deleteOk = true;
            } else {
              console.warn('⚠️ Filename delete failed, falling back to delete-by-url:', resp.status, resp.statusText);
            }
          }

          if (!deleteOk) {
            const resp2 = await fetch(`/api/nextcloud/delete-by-url?${new URLSearchParams({ fileUrl })}`, {
              method: 'DELETE'
            });
            if (resp2.ok) {
              const result2 = await resp2.json();
              console.log('✅ Nextcloud deletion by URL result:', result2);
            } else {
              console.warn('⚠️ Nextcloud deletion by URL failed:', resp2.status, resp2.statusText);
              // Don't throw — continue with DB deletion anyway
            }
          }
        } catch (nextcloudError) {
          console.warn('⚠️ Nextcloud deletion error:', nextcloudError);
          // Continue with DB deletion even if Nextcloud deletion fails
        }
      } else {
        console.warn('⚠️ No file URL found for Nextcloud deletion');
      }

      // Finally delete the track from the database
      const { error } = await supabase
        .from('tracks')
        .delete()
        .eq('id', trackId)
        .eq('generated_by', user?.id);

      if (error) throw error;

      toast({
        title: "Erfolg",
        description: "Song wurde vollständig gelöscht",
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
    <div className="min-h-screen bg-background text-foreground pb-24">
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
            <h1 className="text-3xl font-bold text-foreground">{getUploadsPlaylistName()}</h1>
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
          
          {/* Upload Status */}
          <div className="space-y-3 p-4 bg-card rounded-lg border border-border">
            <h4 className="text-sm font-medium text-foreground">📡 Upload zu Nextcloud</h4>
            <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
              <strong>🇨🇭 Schweizer Hosting:</strong> Alle Daten werden in der Schweiz verarbeitet und gespeichert.
            </div>
            {nextcloudStatus && (
              <div className="text-xs font-mono bg-muted p-2 rounded border border-border">
                {nextcloudStatus}
              </div>
            )}
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/mpeg,audio/wav,audio/flac,audio/ogg,audio/mp3"
                multiple
                onChange={(e) => {
                  const fl = e.target.files;
                  if (fl && fl.length > 0) handleFilesSelected(fl);
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
                {selectedFiles.length > 1
                  ? `${selectedFiles.length} Dateien ausgewählt`
                  : selectedFiles.length === 1
                  ? selectedFiles[0].name
                  : "Audio-Datei(s) auswählen"}
              </Button>
              <span className="text-sm text-muted-foreground">
                Unterstützte Formate: MP3, WAV, FLAC, OGG
              </span>
            </div>
            
            {selectedFiles.length > 0 && (
              <div className="space-y-4 p-4 bg-secondary/20 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium">Ausgewählte Datei:</p>
                    {selectedFiles.length === 1 ? (
                      <>
                        <p className="text-sm text-muted-foreground">{selectedFiles[0].name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(selectedFiles[0].size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </>
                    ) : (
                      <div className="max-h-40 overflow-auto mt-1 text-sm text-muted-foreground space-y-1">
                        {selectedFiles.map((f, i) => (
                          <div key={`${f.name}-${i}`} className="flex justify-between gap-2">
                            <span className="truncate" title={f.name}>{f.name}</span>
                            <span className="shrink-0">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedFiles.length > 1 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Hinweis: Bei Mehrfachauswahl werden Titel/Künstler aus den Dateinamen ermittelt (Schema: "Künstler - Titel").
                      </p>
                    )}
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
                      disabled={
                        uploading ||
                        selectedFiles.length === 0 ||
                        (selectedFiles.length === 1 && (!trackTitle || !trackArtist))
                      }
                      className="flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label="Song hochladen"
                    >
                      <Upload className="h-4 w-4" />
                      {uploading
                        ? "Uploading..."
                        : selectedFiles.length > 1
                        ? "Songs hochladen"
                        : "Song hochladen"}
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

      {/* Actions + Tracks List */}
      <div className="p-6">
        {userTracks.length > 0 && (
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="default"
              className="rounded-full"
              onClick={(e) => {
                // CRITICAL: Synchronous execution path for autoplay compliance
                e.preventDefault();
                
                console.log('🎵 Shuffle Mix clicked - starting synchronous execution');
                
                const shuffled = [...userTracks].sort(() => Math.random() - 0.5);
                const firstTrack = shuffled[0];
                
                if (!firstTrack) {
                  console.log('⚠️ No tracks available for shuffle');
                  return;
                }
                
                console.log('⚡ Starting shuffle mix playback for:', firstTrack.title);
                
                // Use normal play function
                void play(firstTrack as any, shuffled as any);
                console.log('✅ Shuffle mix started');
              }}
            >
              Shuffle Mix
            </Button>
            
            <MetadataEnhancerButton
              tracks={userTracks.map(track => ({
                id: track.id,
                title: track.title,
                artist: track.artist || 'Unknown Artist',
                album: track.album
              }))}
              onUpdateTracks={fetchUserTracks}
            />
          </div>
        )}
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
                    imageUrl: track.artwork_url || undefined
                  }}
                  onPlay={() => handleTrackPlay(track)}
                  isCurrentTrack={currentTrack?.id === track.id}
                  isPlaying={isPlaying && currentTrack?.id === track.id}
                />
                <AddToPlaylistDialog
                  trackId={track.id}
                  trigger={
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute top-2 right-24 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                      title="Zur Playlist hinzufügen"
                    >
                      <ListPlus className="h-4 w-4" />
                    </Button>
                  }
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-2 right-12 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                  onClick={() => toggleTrackPublic(track, !(track as any).is_public)}
                  title={(track as any).is_public ? "Privat machen" : "Öffentlich machen"}
                >
                  {(track as any).is_public ? (
                    <Lock className="h-4 w-4" />
                  ) : (
                    <Globe className="h-4 w-4" />
                  )}
                </Button>
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

  {/* Global MusicPlayer rendered at app root */}
    </div>
  );
}