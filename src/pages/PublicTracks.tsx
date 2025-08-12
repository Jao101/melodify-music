import { useState, useEffect, useCallback } from "react";
import { Music, Globe, User, ArrowLeft, MoreHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Track } from "@/hooks/useTracks";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LikeButton } from "@/components/music/LikeButton";
import { TrackCard } from "@/components/music/TrackCard";

export default function PublicTracks() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [publicTracks, setPublicTracks] = useState<Track[]>([]);
  const [myPublicTracks, setMyPublicTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  // Only get what we need from audio player to reduce re-renders
  const { currentTrack, isPlaying, play, togglePlayPause, setQueue } = useAudioPlayer();

  // Fetch all public tracks
  const fetchPublicTracks = useCallback(async () => {
    try {
      console.log('🔍 Fetching public tracks with all fields...');
      const { data, error } = await supabase
        .from('tracks')
        .select(`
          *,
          profiles:user_id (
            display_name
          ),
          generator_profiles:generated_by (
            display_name
          )
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('📊 Raw public tracks data from DB:', data);
      if (data && data.length > 0) {
        console.log('🔍 First track detailed:', data[0]);
        console.log('🔍 Available fields:', Object.keys(data[0]));
      }
      
      setPublicTracks(data || []);
    } catch (error) {
      console.error('Error fetching public tracks:', error);
      toast({
        title: "Error",
        description: "Failed to load public tracks",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Fetch user's public tracks
  const fetchMyPublicTracks = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .or(`user_id.eq.${user.id},generated_by.eq.${user.id}`)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyPublicTracks(data || []);
    } catch (error) {
      console.error('Error fetching my public tracks:', error);
      toast({
        title: "Error", 
        description: "Failed to load your public tracks",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  // Toggle track public status
  const toggleTrackPublic = async (track: Track, isPublic: boolean) => {
    // Check ownership - berücksichtige beide user_id und generated_by
    const isOwner = user && (
      (track as any).user_id === user.id || 
      (track as any).generated_by === user.id
    );
    
    if (!user || !isOwner) {
      toast({
        title: "Error",
        description: "You can only modify your own tracks",
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
        title: "Success",
        description: `Track ${isPublic ? 'made public' : 'made private'}`,
      });

      // Update local state immediately to prevent reloading
      if (isPublic) {
        // Track was made private, remove from both lists
        setPublicTracks(prev => prev.filter(t => t.id !== track.id));
        setMyPublicTracks(prev => prev.filter(t => t.id !== track.id));
      } else {
        // Just refresh the data once instead of constantly
        setTimeout(() => {
          fetchPublicTracks();
          fetchMyPublicTracks();
        }, 500);
      }
    } catch (error) {
      console.error('Error updating track visibility:', error);
      toast({
        title: "Error",
        description: "Failed to update track visibility",
        variant: "destructive",
      });
    }
  };

  // Handle track play/pause - same as MyUploads
  const handlePlayPause = async (track: Track) => {
    console.log('🔍 Original track data from database:', track);
    
    // Transform track to match BaseTrack interface for audio player
    // Don't overwrite audio_url if it already exists!
    const playableTrack = {
      ...track,
      audio_url: (track as any).audio_url || track.file_url, // Use audio_url if exists, otherwise file_url
    };
    
    console.log('🎵 Transformed playable track:', playableTrack);
    
    // Wenn es der gleiche Track ist, einfach Play/Pause togglen
    if (currentTrack?.id === track.id) {
      togglePlayPause();
    } else {
      // Wenn es ein neuer Track ist, erst Queue setzen und dann abspielen
      try {
        // Transform all tracks for the queue
        const playableQueue = publicTracks.map(t => ({
          ...t,
          audio_url: (t as any).audio_url || t.file_url, // Use audio_url if exists, otherwise file_url
        }));
        
        console.log('🎵 Setting queue with transformed tracks:', playableQueue);
        
        // Set the queue to all public tracks and play the selected one
        setQueue(playableQueue as any);
        await play(playableTrack as any, playableQueue as any);
      } catch (error: any) {
        console.error('🚨 Error playing public track:', error);
        toast({
          title: "Error",
          description: error?.message || "Failed to play track",
          variant: "destructive",
        });
      }
    }
  };

  // Load data on component mount - optimized to prevent excessive reloading
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (!isMounted) return;
      setLoading(true);
      
      try {
        await Promise.all([fetchPublicTracks(), fetchMyPublicTracks()]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [user]); // Only depend on user, not the fetch functions

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Loading public tracks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pb-24">
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Globe className="h-8 w-8" />
            Public Tracks
          </h1>
          <p className="text-muted-foreground">
            Discover music shared by the community
          </p>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            All Public Tracks ({publicTracks.length})
          </TabsTrigger>
          <TabsTrigger value="mine" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            My Public Tracks ({myPublicTracks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {publicTracks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Globe className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Public Tracks Yet</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  No users have shared their tracks publicly yet. Be the first to share your music with the community!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {publicTracks.map((track) => {
                // Check ownership considering both user_id and generated_by
                const isOwner = user && (
                  (track as any).user_id === user.id || 
                  (track as any).generated_by === user.id
                );
                
                return (
                  <div key={track.id} className="relative group">
                    <TrackCard
                      track={track}
                      isPlaying={currentTrack?.id === track.id && isPlaying}
                      onPlay={() => handlePlayPause(track)}
                    />
                    
                    {/* Action buttons overlay - like MyUploads */}
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <LikeButton trackId={track.id} />
                      
                      {isOwner && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="bg-background/80 backdrop-blur-sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => toggleTrackPublic(track, false)}>
                              Make Private
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="mine" className="mt-6">
          {myPublicTracks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <User className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Public Tracks</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  You haven't made any tracks public yet. Go to "My Uploads" to make your tracks public and share them with the community.
                </p>
                <Button 
                  className="mt-4" 
                  onClick={() => navigate('/my-uploads')}
                >
                  Go to My Uploads
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {myPublicTracks.map((track) => (
                <div key={track.id} className="relative group">
                  <TrackCard
                    track={track}
                    isPlaying={currentTrack?.id === track.id && isPlaying}
                    onPlay={() => handlePlayPause(track)}
                  />
                  
                  {/* Action buttons overlay - like MyUploads */}
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <LikeButton trackId={track.id} />
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="bg-background/80 backdrop-blur-sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toggleTrackPublic(track, false)}>
                          Make Private
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
