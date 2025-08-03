import { useState } from "react";
import { Heart, Clock, Music, Search, Grid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { TrackCard } from "@/components/music/TrackCard";
import { MusicPlayer } from "@/components/music/MusicPlayer";
import { LikeButton } from "@/components/music/LikeButton";
import { useTracks } from "@/hooks/useTracks";
import { useLikedTracks } from "@/hooks/useLikedTracks";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Library() {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(75);

  const { tracks, loading: tracksLoading } = useTracks();
  const { likedTracks, loading: likedLoading } = useLikedTracks();
  const { user } = useAuth();
  const navigate = useNavigate();

  const filteredTracks = tracks.filter(track =>
    track.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    track.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (track.album && track.album.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleTrackPlay = (track: any) => {
    if (currentTrack?.id === track.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentTrack(track);
      setIsPlaying(true);
      setCurrentTime(0);
    }
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    if (!currentTrack) return;
    const currentIndex = filteredTracks.findIndex(t => t.id === currentTrack.id);
    const nextTrack = filteredTracks[currentIndex + 1];
    if (nextTrack) {
      setCurrentTrack(nextTrack);
      setCurrentTime(0);
    }
  };

  const handlePrevious = () => {
    if (!currentTrack) return;
    const currentIndex = filteredTracks.findIndex(t => t.id === currentTrack.id);
    const prevTrack = filteredTracks[currentIndex - 1];
    if (prevTrack) {
      setCurrentTrack(prevTrack);
      setCurrentTime(0);
    }
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
            <Music className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">Sign in to access your library</h2>
          <p className="text-muted-foreground">Create an account or sign in to save your favorite songs</p>
          <Button onClick={() => navigate('/auth')}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="p-6 bg-gradient-to-b from-primary/10 to-background">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Your Library</h1>
            <p className="text-muted-foreground mt-1">
              {filteredTracks.length} songs available
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search your library..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-background"
          />
        </div>
      </div>

      {/* Quick Access Cards */}
      <div className="px-6 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card 
            className="music-card p-4 cursor-pointer hover:bg-secondary/50 transition-colors"
            onClick={() => navigate('/liked-songs')}
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-md flex items-center justify-center">
                <Heart className="h-6 w-6 text-white fill-current" />
              </div>
              <div>
                <h3 className="font-semibold">Liked Songs</h3>
                <p className="text-sm text-muted-foreground">
                  {likedTracks.length} songs
                </p>
              </div>
            </div>
          </Card>

          <Card className="music-card p-4 cursor-pointer hover:bg-secondary/50 transition-colors opacity-50">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-md flex items-center justify-center">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">Recently Played</h3>
                <p className="text-sm text-muted-foreground">Coming soon</p>
              </div>
            </div>
          </Card>

          <Card className="music-card p-4 cursor-pointer hover:bg-secondary/50 transition-colors opacity-50">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-md flex items-center justify-center">
                <Music className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">AI Generated</h3>
                <p className="text-sm text-muted-foreground">Coming soon</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Tracks List */}
      <div className="flex-1 px-6 pb-24 overflow-auto">
        <div className="space-y-2">
          {tracksLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading tracks...</p>
            </div>
          ) : filteredTracks.length === 0 ? (
            <div className="text-center py-12">
              <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No tracks found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try adjusting your search terms' : 'No tracks available in the library'}
              </p>
            </div>
          ) : (
            filteredTracks.map((track) => (
              <div key={track.id} className="flex items-center gap-2">
                <div className="flex-1">
                  <TrackCard
                    track={{
                      id: track.id,
                      title: track.title,
                      artist: track.artist,
                      album: track.album || 'Unknown Album',
                      duration: track.duration,
                      imageUrl: track.image_url,
                      isAI: track.is_ai_generated
                    }}
                    isPlaying={isPlaying}
                    isCurrentTrack={currentTrack?.id === track.id}
                    onPlay={() => handleTrackPlay(track)}
                  />
                </div>
                <LikeButton trackId={track.id} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Music Player */}
      <MusicPlayer
        currentTrack={currentTrack ? {
          id: currentTrack.id,
          title: currentTrack.title,
          artist: currentTrack.artist,
          album: currentTrack.album || 'Unknown Album',
          duration: currentTrack.duration,
          audioUrl: currentTrack.audio_url,
          imageUrl: currentTrack.image_url
        } : undefined}
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onSeek={handleSeek}
        currentTime={currentTime}
        volume={volume}
        onVolumeChange={handleVolumeChange}
      />
    </div>
  );
}