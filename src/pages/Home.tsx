import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { MusicPlayer } from "@/components/music/MusicPlayer";
import { TrackCard } from "@/components/music/TrackCard";
import { SubscriptionPlans } from "@/components/subscription/SubscriptionPlans";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Music, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { useAudioPlayer, isPlayableTrack } from "@/hooks/useAudioPlayer";
import { usePlaybackSync } from "@/hooks/usePlaybackSync";

export default function Home() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    setVolume,
    play,
    prime,
    togglePlayPause,
    next,
    previous,
    seek,
    setQueue,
  } = useAudioPlayer();

  // Persist playback heartbeat
  usePlaybackSync({ trackId: currentTrack?.id, positionSec: currentTime, isPlaying });
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSubscriptionPlans, setShowSubscriptionPlans] = useState(false);

  const { profile, subscribeToplan } = useAuth();

  // Load tracks from Supabase
  useEffect(() => {
    loadTracks();
  }, []);

  const loadTracks = async () => {
    try {
      setLoading(true);
  const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
  // Only include tracks with audio_url or storage_path
  const filtered = (data || []).filter(isPlayableTrack);
  setTracks(filtered);
  setQueue(filtered as any);
      // Try to resume previous playback state
      try {
        const { getPlaybackState } = await import("@/services/playbackService");
        const state = await getPlaybackState();
        if (state?.track_id) {
          const resumeTrack = filtered.find(t => t.id === state.track_id);
          if (resumeTrack) {
            await prime(resumeTrack as any, state.position || 0, filtered as any);
          }
        }
      } catch {
        // ignore resume errors
      }
    } catch (error) {
      console.error('Error loading tracks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayTrack = (track: any) => {
    void play(track, tracks as any);
  };

  const handlePlayPause = () => { void togglePlayPause(); };

  const handleNext = () => { next(); };

  const handlePrevious = () => { previous(); };

  const handleSeek = (time: number) => { seek(time); };

  const handleVolumeChange = (newVolume: number) => { setVolume(newVolume); };

  // Handle subscription plan selection
  const handleSelectPlan = async (planId: string, isYearly: boolean) => {
    try {
      const checkoutUrl = await subscribeToplan(planId, isYearly);
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    } catch (error) {
      console.error('Error selecting plan:', error);
    }
  };

  const handleShowSubscriptionPlans = () => {
    setShowSubscriptionPlans(true);
  };

  const toggleSubscriptionPlans = () => {
    setShowSubscriptionPlans(prev => !prev);
  };

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Prüfen, ob der Benutzer kostenlos ist (zeige immer Upgrade-Möglichkeit)
  const isFreeTier = !profile?.subscription_tier || profile?.subscription_tier === 'free';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar onShowSubscriptionPlans={handleShowSubscriptionPlans} />
        <main className="flex-1 pb-24 overflow-y-auto">
          {/* Spotify-style gradient header with adjustments for new sidebar */}
          <header className="sticky top-0 z-40 bg-gradient-to-b from-primary/5 via-background/95 to-background backdrop-blur-sm pt-2">
            <div className="flex items-center justify-between p-4 md:p-6">
              <div className="flex items-center gap-6">
                <SidebarTrigger className="bg-black/40 rounded-full p-2 md:hidden" />
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                  {getGreeting()}, <span className="text-primary">{profile?.display_name || 'Music Lover'}</span>
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="bg-black/30 text-muted-foreground border-0 px-3 py-1">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {profile?.subscription_tier || 'Free'} Plan
                </Badge>
                {isFreeTier && (
                  <Button 
                    variant="default" 
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-6 py-2 rounded-full"
                    onClick={toggleSubscriptionPlans}
                  >
                    Upgrade
                  </Button>
                )}
              </div>
            </div>
          </header>

          <div className="px-4 md:px-6 pb-6 space-y-10">
            {/* Main Content - Music Library with Spotify styling */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="group cursor-pointer">
                  <h2 className="text-2xl font-bold text-foreground group-hover:underline">
                    Your Music Library
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">Listen to your collection</p>
                </div>
                {tracks.length > 0 && (
                  <Button 
                    variant="ghost" 
                    className="text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    Show all
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              {loading ? (
                // Loading skeleton - Spotify style grid
                <div className="spotify-grid">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="music-card animate-pulse p-0 rounded-lg overflow-hidden">
                      <div className="aspect-square bg-secondary/40 rounded-md mb-3"></div>
                      <div className="px-3 pb-3 space-y-2">
                        <div className="h-4 bg-secondary/40 rounded w-3/4"></div>
                        <div className="h-3 bg-secondary/30 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : tracks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tracks.map((track) => (
                    <TrackCard
                      key={track.id}
                      track={track}
                      isPlaying={isPlaying && currentTrack?.id === track.id}
                      isCurrentTrack={currentTrack?.id === track.id}
                      onPlay={() => handlePlayTrack(track)}
                    />
                  ))}
                </div>
              ) : (
                // Empty state - Enhanced Spotify style
                <div className="rounded-xl bg-gradient-to-b from-secondary/30 to-secondary/10 p-8 text-center">
                  <div className="mx-auto h-24 w-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
                    <Music className="h-12 w-12 text-primary/80" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">It's a bit quiet here</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Your library is empty. Upgrade to Premium to unlock AI music generation and start creating your personal collection.
                  </p>
                  <Button 
                    onClick={toggleSubscriptionPlans}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-8 py-5 text-sm font-medium hover:scale-105 transition-transform"
                  >
                    Upgrade to Premium
                  </Button>
                </div>
              )}
            </section>

            {/* For You Section - Spotify-like additional content section */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="group cursor-pointer">
                  <h2 className="text-2xl font-bold text-foreground group-hover:underline">
                    For You
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">Curated collections</p>
                </div>
              </div>
              
              {/* Spotify-like content boxes with gradient backgrounds */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="rounded-lg p-6 bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 hover:border-primary/30 transition-colors cursor-pointer hover:shadow-lg">
                  <h3 className="text-lg font-bold mb-1">Coming Soon</h3>
                  <p className="text-sm text-muted-foreground">AI-powered music recommendations</p>
                </div>
                <div className="rounded-lg p-6 bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/10 hover:border-purple-500/30 transition-colors cursor-pointer hover:shadow-lg">
                  <h3 className="text-lg font-bold mb-1">Coming Soon</h3>
                  <p className="text-sm text-muted-foreground">Top charts and new releases</p>
                </div>
                <div className="rounded-lg p-6 bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/10 hover:border-blue-500/30 transition-colors cursor-pointer hover:shadow-lg">
                  <h3 className="text-lg font-bold mb-1">Coming Soon</h3>
                  <p className="text-sm text-muted-foreground">Your personalized AI mixes</p>
                </div>
              </div>
            </section>

            {/* Premium Plan Section - Toggle mit verbesserten Kontrollen */}
            <section className="relative">
              {/* Wenn Benutzer kostenlos ist, zeige immer die Überschrift */}
              {isFreeTier && (
                <div className="flex items-center justify-between mb-2">
                  <div className="group cursor-pointer">
                    <h2 className="text-2xl font-bold text-foreground group-hover:underline flex items-center gap-2">
                      Premium Plans
                      <Badge variant="outline" className="border-primary/30 text-primary ml-2 px-2 py-0.5 rounded-full">
                        <Sparkles className="h-3 w-3 mr-1" /> Recommended
                      </Badge>
                    </h2>
                  </div>
                  <Button 
                    variant="ghost"
                    onClick={toggleSubscriptionPlans}
                    className="text-primary hover:text-primary/90 hover:bg-primary/10 rounded-full flex items-center gap-1"
                  >
                    {showSubscriptionPlans ? (
                      <>Hide Plans <ChevronUp className="h-4 w-4" /></>
                    ) : (
                      <>Show Plans <ChevronDown className="h-4 w-4" /></>
                    )}
                  </Button>
                </div>
              )}

              {/* Subscription Plans - Mit Toggle-Logik */}
              {(showSubscriptionPlans || false) && (
                <div className="rounded-xl bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 p-8 border border-primary/10 transition-all duration-300">
                  <div className="text-center mb-8">
                    <Badge variant="outline" className="border-primary/30 text-primary mb-4 px-4 py-1 rounded-full">
                      <Sparkles className="h-3 w-3 mr-1" /> Premium
                    </Badge>
                    <h2 className="text-3xl font-bold mb-4">Upgrade Your Experience</h2>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                      Unlock unlimited AI music generation and premium features
                    </p>
                  </div>
                  <SubscriptionPlans 
                    onSelectPlan={handleSelectPlan} 
                    currentPlan={profile?.subscription_tier || 'free'} 
                  />
                  <div className="text-center mt-8">
                    <Button 
                      variant="outline" 
                      onClick={toggleSubscriptionPlans}
                      className="text-muted-foreground border-muted-foreground/30 hover:text-foreground rounded-full px-6 flex items-center gap-1"
                    >
                      Hide Plans <ChevronUp className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </main>

        <MusicPlayer
          currentTrack={currentTrack ? {
            id: currentTrack.id,
            title: currentTrack.title,
            artist: currentTrack.artist,
            album: currentTrack.album,
            duration: duration || currentTrack.duration || 0,
            audioUrl: currentTrack.audio_url || undefined,
            imageUrl: currentTrack.image_url || undefined,
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
    </SidebarProvider>
  );
}