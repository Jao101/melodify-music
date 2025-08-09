import { useState } from "react";
import { Heart, Clock, Music, Search, Grid, List, ArrowLeft, Plus, Compass, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useLikedTracks } from "@/hooks/useLikedTracks";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import CreatePlaylistDialog from "@/components/playlists/CreatePlaylistDialog";
import { useUserPlaylists } from "@/hooks/useUserPlaylists";

export default function Library() {
  const [searchTerm, setSearchTerm] = useState("");
  const { likedTracks, loading: likedLoading } = useLikedTracks();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { playlists, loading: playlistsLoading, refetch: refetchPlaylists } = useUserPlaylists();

  // Playlist categories - only show actual playlists, no direct songs
  const playlistCategories = [
    {
      id: 'liked-songs',
      title: "Liked Songs",
      description: `${likedTracks.length} songs`,
      icon: Heart,
      url: "/liked-songs",
      gradient: "from-purple-500 to-pink-500",
      available: true
    },
    {
      id: 'recently-played',
      title: "Recently Played",
      description: "Your recent listening history",
      icon: Clock,
      url: "/recently-played",
      gradient: "from-green-500 to-blue-500",
      available: false
    },
    {
      id: 'ai-generated',
      title: "AI Generated",
      description: "Your AI-created songs",
      icon: Music,
      url: "/ai-generated",
      gradient: "from-orange-500 to-red-500",
      available: false
    },
    {
      id: 'discover-weekly',
      title: "Discover Weekly",
      description: "Your personalized playlist",
      icon: Compass,
      url: "/discover-weekly",
      gradient: "from-indigo-500 to-purple-500",
      available: false
    },
    {
      id: 'top-charts',
      title: "Top Charts",
      description: "Popular songs this week",
      icon: Globe,
      url: "/top-charts",
      gradient: "from-yellow-500 to-orange-500",
      available: false
    }
  ];

  const filteredPlaylists = playlistCategories.filter(playlist =>
    playlist.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    playlist.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="hover:bg-secondary/70"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Your Library</h1>
              <p className="text-muted-foreground mt-1">
                Your playlists and collections
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <CreatePlaylistDialog mode="icon" onCreated={refetchPlaylists} />
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search in your library..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-background/50 backdrop-blur-sm"
          />
        </div>
      </div>

      {/* Playlists Grid */}
      <div className="flex-1 px-6 pb-6 overflow-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPlaylists.map((playlist) => {
            const Icon = playlist.icon;
            
            return (
              <Card 
                key={playlist.id}
                className={`music-card group cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
                  !playlist.available ? 'opacity-60' : ''
                }`}
                onClick={() => {
                  if (playlist.available) {
                    navigate(playlist.url);
                  }
                }}
              >
                <div className="p-6">
                  {/* Playlist Cover */}
                  <div className={`h-32 w-full rounded-lg bg-gradient-to-br ${playlist.gradient} flex items-center justify-center mb-4 group-hover:shadow-lg transition-shadow`}>
                    <Icon className="h-12 w-12 text-white" />
                  </div>
                  
                  {/* Playlist Info */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {playlist.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {playlist.description}
                    </p>
                    
                    {!playlist.available && (
                      <div className="flex items-center gap-1 mt-2">
                        <span className="text-xs bg-secondary/70 px-2 py-1 rounded-full text-muted-foreground">
                          Coming Soon
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredPlaylists.length === 0 && (
          <div className="text-center py-12">
            <Music className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No playlists found</h3>
            <p className="text-muted-foreground">
              {searchTerm ? 'Try adjusting your search terms' : 'Start by liking some songs to create your first playlist'}
            </p>
          </div>
        )}

        {/* Create Playlist Section */}
        <div className="mt-8 pt-6 border-t border-border">
          <h2 className="text-xl font-semibold mb-4">Deine Playlists</h2>
          {playlistsLoading ? (
            <p className="text-muted-foreground">Lade Playlists...</p>
          ) : playlists.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {playlists.map((pl) => (
                <Card key={pl.id} className="music-card p-6 cursor-pointer transition-all duration-300 hover:scale-[1.02]">
                  <div className="space-y-3">
                    <div className="h-32 w-full rounded-lg bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center mb-2">
                      <Music className="h-10 w-10 text-foreground/80" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{pl.name}</h3>
                      {pl.description && (
                        <p className="text-sm text-muted-foreground mt-1">{pl.description}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 border border-dashed rounded-lg">
              <p className="text-muted-foreground mb-4">Du hast noch keine Playlists.</p>
              <CreatePlaylistDialog mode="button" onCreated={refetchPlaylists} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}