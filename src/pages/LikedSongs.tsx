import { useState } from "react";
import { Heart, Search, ArrowLeft, Play, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrackCard } from "@/components/music/TrackCard";
import { MusicPlayer } from "@/components/music/MusicPlayer";
import { LikeButton } from "@/components/music/LikeButton";
import { useLikedTracks } from "@/hooks/useLikedTracks";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function LikedSongs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(75);

  const { likedTracks, loading } = useLikedTracks();
  const { user } = useAuth();
  const navigate = useNavigate();

  const filteredTracks = likedTracks.filter(likedTrack =>
    likedTrack.track.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    likedTrack.track.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (likedTrack.track.album && likedTrack.track.album.toLowerCase().includes(searchTerm.toLowerCase()))
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
    const currentIndex = filteredTracks.findIndex(lt => lt.track.id === currentTrack.id);
    const nextTrack = filteredTracks[currentIndex + 1]?.track;
    if (nextTrack) {
      setCurrentTrack(nextTrack);
      setCurrentTime(0);
    }
  };

  const handlePrevious = () => {
    if (!currentTrack) return;
    const currentIndex = filteredTracks.findIndex(lt => lt.track.id === currentTrack.id);
    const prevTrack = filteredTracks[currentIndex - 1]?.track;
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

  const handlePlayAll = () => {
    if (filteredTracks.length > 0) {
      const firstTrack = filteredTracks[0].track;
      setCurrentTrack(firstTrack);
      setIsPlaying(true);
      setCurrentTime(0);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Heart className="h-8 w-8 text-white fill-current" />
          </div>
          <h2 className="text-xl font-semibold">Sign in to see your liked songs</h2>
          <p className="text-muted-foreground">Save songs you love to access them here</p>
          <Button onClick={() => navigate('/auth')}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header with Gradient */}
      <div className="bg-gradient-to-b from-purple-600/20 via-pink-500/10 to-background p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/library')}
            className="hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg">
              <Heart className="h-8 w-8 text-white fill-current" />
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground uppercase tracking-wider">Playlist</p>
              <h1 className="text-4xl font-bold text-foreground">Liked Songs</h1>
              <p className="text-muted-foreground mt-1">
                {filteredTracks.length} {filteredTracks.length === 1 ? 'song' : 'songs'}
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search in liked songs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-background/50 backdrop-blur-sm"
          />
        </div>
      </div>

      {/* Action Buttons */}
      {filteredTracks.length > 0 && (
        <div className="px-6 py-4 flex items-center gap-4">
          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-12 px-8"
            onClick={handlePlayAll}
          >
            <Play className="h-5 w-5 mr-2" />
            Play All
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            className="rounded-full h-12 px-6"
            disabled
          >
            <Shuffle className="h-5 w-5 mr-2" />
            Shuffle
          </Button>
        </div>
      )}

      {/* Tracks List */}
      <div className="flex-1 px-6 pb-24 overflow-auto">
        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading your liked songs...</p>
            </div>
          ) : filteredTracks.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-6">
                <Heart className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {searchTerm ? 'No matching songs' : 'No liked songs yet'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchTerm 
                  ? 'Try adjusting your search terms' 
                  : 'Songs you like will appear here. Start by exploring the library!'
                }
              </p>
              {!searchTerm && (
                <Button onClick={() => navigate('/library')}>
                  Browse Library
                </Button>
              )}
            </div>
          ) : (
            filteredTracks.map((likedTrack, index) => (
              <div key={likedTrack.id} className="flex items-center gap-2">
                <div className="w-8 text-center text-sm text-muted-foreground">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <TrackCard
                    track={{
                      id: likedTrack.track.id,
                      title: likedTrack.track.title,
                      artist: likedTrack.track.artist,
                      album: likedTrack.track.album || 'Unknown Album',
                      duration: likedTrack.track.duration,
                      imageUrl: likedTrack.track.image_url,
                      isAI: likedTrack.track.is_ai_generated
                    }}
                    isPlaying={isPlaying}
                    isCurrentTrack={currentTrack?.id === likedTrack.track.id}
                    onPlay={() => handleTrackPlay(likedTrack.track)}
                  />
                </div>
                <LikeButton trackId={likedTrack.track.id} />
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