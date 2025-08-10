import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TrackCard } from "@/components/music/TrackCard";
import { Button } from "@/components/ui/button";
import { Music, ChevronRight } from "lucide-react";
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
  // Home no longer lists all songs
  const { profile } = useAuth();
  // No all-tracks grid on Home anymore
  useEffect(() => { /* reserved for future featured content */ }, []);

  const handlePlayPause = () => { void togglePlayPause(); };

  const handleNext = () => { next(); };

  const handlePrevious = () => { previous(); };

  const handleSeek = (time: number) => { seek(time); };

  const handleVolumeChange = (newVolume: number) => { setVolume(newVolume); };

  // no subscription UI in free version

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Subscription removed: app is fully free

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
  <AppSidebar />
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
              <div className="flex items-center gap-3" />
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
                <div />
              </div>
              
              {/* CTA instead of all-tracks grid */}
              <div className="rounded-xl bg-gradient-to-b from-secondary/30 to-secondary/10 p-8 text-center">
                <div className="mx-auto h-24 w-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
                  <Music className="h-12 w-12 text-primary/80" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Starte mit deinen Playlists</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Lade Songs hoch, sie landen automatisch in deiner Playlist „Hochgeladene Songs“.
                </p>
                <div className="flex justify-center gap-3">
                  <Button onClick={() => window.location.href = '/my-uploads'} className="rounded-full px-6">Songs hochladen</Button>
                  <Button variant="outline" onClick={() => window.location.href = '/library'} className="rounded-full px-6">Zu deinen Playlists</Button>
                </div>
              </div>
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

            {/* Premium section removed in free version */}
          </div>
        </main>

      </div>
    </SidebarProvider>
  );
}