import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { MusicPlayer } from "@/components/music/MusicPlayer";
import { TrackCard } from "@/components/music/TrackCard";
import { SubscriptionPlans } from "@/components/subscription/SubscriptionPlans";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Sparkles, TrendingUp, Clock, Music, Heart } from "lucide-react";

// Sample data for demo
const featuredTracks = [
  {
    id: '1',
    title: 'Cosmic Journey',
    artist: 'AI Composer',
    album: 'Digital Dreams',
    duration: 240,
    isAI: true,
    imageUrl: '/api/placeholder/300/300'
  },
  {
    id: '2',
    title: 'Neon Nights',
    artist: 'Synthwave AI',
    album: 'Retro Future',
    duration: 195,
    isAI: true,
    imageUrl: '/api/placeholder/300/300'
  },
  {
    id: '3',
    title: 'Electric Dreams',
    artist: 'Digital Harmony',
    album: 'AI Beats Vol. 1',
    duration: 287,
    isAI: true,
    imageUrl: '/api/placeholder/300/300'
  },
];

const recentlyPlayed = [
  {
    id: '4',
    title: 'Midnight Groove',
    artist: 'AI Jazz Collective',
    album: 'Smooth Algorithms',
    duration: 210,
    isAI: true,
  },
  {
    id: '5',
    title: 'Bass Drop Paradise',
    artist: 'Electronic AI',
    album: 'Club Bangers',
    duration: 180,
    isAI: true,
  },
];

export default function Home() {
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(75);

  const handlePlayTrack = (track: any) => {
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
    // Implementation for next track
  };

  const handlePrevious = () => {
    // Implementation for previous track
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
  };

  const handleSelectPlan = (planId: string, isYearly: boolean) => {
    console.log('Selected plan:', planId, 'Yearly:', isYearly);
    // Implementation for plan selection
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 pb-24">
          <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <h1 className="text-2xl font-bold gradient-text">
                  Good evening
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Free Plan
                </Badge>
                <Button variant="default" className="bg-primary hover:bg-primary/90">
                  Upgrade to Premium
                </Button>
              </div>
            </div>
          </header>

          <div className="p-6 space-y-8">
            {/* Quick Actions */}
            <section>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  className="h-16 flex items-center justify-start gap-3 bg-primary/5 border-primary/20 hover:bg-primary/10"
                >
                  <Music className="h-6 w-6 text-primary" />
                  <span className="font-semibold">Generate AI Song</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-16 flex items-center justify-start gap-3 bg-secondary/50 hover:bg-secondary/70"
                >
                  <Heart className="h-6 w-6 text-accent" />
                  <span className="font-semibold">Liked Songs</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-16 flex items-center justify-start gap-3 bg-secondary/50 hover:bg-secondary/70"
                >
                  <Clock className="h-6 w-6" />
                  <span className="font-semibold">Recently Played</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-16 flex items-center justify-start gap-3 bg-secondary/50 hover:bg-secondary/70"
                >
                  <TrendingUp className="h-6 w-6" />
                  <span className="font-semibold">Trending</span>
                </Button>
              </div>
            </section>

            {/* Featured AI Tracks */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Featured AI Tracks</h2>
                <Button variant="ghost" className="text-primary hover:text-primary/80">
                  See all
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {featuredTracks.map((track) => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    isPlaying={isPlaying && currentTrack?.id === track.id}
                    isCurrentTrack={currentTrack?.id === track.id}
                    onPlay={() => handlePlayTrack(track)}
                  />
                ))}
              </div>
            </section>

            {/* Recently Played */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Recently Played</h2>
                <Button variant="ghost" className="text-primary hover:text-primary/80">
                  See all
                </Button>
              </div>
              <div className="space-y-2">
                {recentlyPlayed.map((track) => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    isPlaying={isPlaying && currentTrack?.id === track.id}
                    isCurrentTrack={currentTrack?.id === track.id}
                    onPlay={() => handlePlayTrack(track)}
                  />
                ))}
              </div>
            </section>

            {/* Subscription Plans */}
            <section>
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-4">Choose Your Plan</h2>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                  Unlock the full potential of AI-powered music with our premium plans
                </p>
              </div>
              <SubscriptionPlans onSelectPlan={handleSelectPlan} />
            </section>
          </div>
        </main>

        <MusicPlayer
          currentTrack={currentTrack}
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