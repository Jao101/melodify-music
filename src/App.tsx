import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Library from "./pages/Library";
import LikedSongs from "./pages/LikedSongs";
import NotFound from "./pages/NotFound";
import MyUploads from "./pages/MyUploads";
import Playlist from "./pages/Playlist";
import AccountSettings from "./pages/AccountSettings";
import NotificationSettingsPage from "./pages/NotificationSettings";
import AppSettings from "./pages/AppSettings";
import About from "./pages/About";
import { AudioPlayerProvider, useAudioPlayer } from "@/hooks/useAudioPlayer";
import { MusicPlayer } from "@/components/music/MusicPlayer";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

// Import test function for debugging
import "@/utils/testMusicBrainz";

const queryClient = new QueryClient();

function GlobalPlayer() {
  const { user, loading } = useAuth();
  const { currentTrack, isPlaying, currentTime, duration, volume, setVolume, togglePlayPause, next, previous, seek } = useAudioPlayer();
  
  // Update document title based on playback state
  useDocumentTitle({ 
    currentTrack: currentTrack ? {
      title: currentTrack.title || 'Unknown Track',
      artist: currentTrack.artist || 'Unknown Artist'
    } : null,
    isPlaying 
  });
  
  // Only show player if user is logged in AND auth loading is complete
  // Also wait a bit after login to avoid showing during success message
  const [showPlayer, setShowPlayer] = useState(false);
  
  useEffect(() => {
    if (!user || loading) {
      setShowPlayer(false);
      return;
    }
    
    // Small delay to ensure success message is shown first
    const timer = setTimeout(() => {
      setShowPlayer(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [user, loading]);
  
  // Debug duration values only when they change - ALWAYS call this hook
  useEffect(() => {
    if (currentTrack && showPlayer) {
      const finalDuration = duration && duration > 0 ? duration : (currentTrack?.duration && currentTrack.duration > 0 ? currentTrack.duration : 0);
      console.log('🔍 Duration Debug:', {
        hookDuration: duration,
        trackDuration: currentTrack?.duration,
        finalDuration,
        trackTitle: currentTrack?.title,
        isHookDurationValid: duration && duration > 0,
        isTrackDurationValid: currentTrack?.duration && currentTrack.duration > 0
      });
    }
  }, [duration, currentTrack?.duration, currentTrack?.title, showPlayer]);
  
  if (!showPlayer) return null;
  
  // Better duration calculation with fallbacks
  const calculateDuration = () => {
    // Priority: hook duration (from audio metadata) > track duration (from DB) > 0
    if (duration && duration > 0) return duration;
    if (currentTrack?.duration && currentTrack.duration > 0) return currentTrack.duration;
    return 0;
  };
  
  const finalDuration = calculateDuration();
  
  const props = {
    currentTrack: currentTrack
      ? {
          id: currentTrack.id,
          title: currentTrack.title || '',
          artist: currentTrack.artist || '',
          album: currentTrack.album || '',
          duration: finalDuration,
          audioUrl: currentTrack.audio_url || undefined,
          imageUrl: currentTrack.image_url || undefined,
        }
      : undefined,
    isPlaying: isPlaying,
    onPlayPause: () => void togglePlayPause(),
    onNext: () => next(),
    onPrevious: () => previous(),
    onSeek: (t: number) => seek(t),
    currentTime,
    volume,
    onVolumeChange: setVolume,
  } as const;
  return <MusicPlayer {...(props as any)} />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SettingsProvider>
            <AudioPlayerProvider>
              <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/library" 
              element={
                <ProtectedRoute>
                  <Library />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/liked-songs" 
              element={
                <ProtectedRoute>
                  <LikedSongs />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/my-uploads" 
              element={
                <ProtectedRoute>
                  <MyUploads />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/playlist/:id" 
              element={
                <ProtectedRoute>
                  <Playlist />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/account-settings" 
              element={
                <ProtectedRoute>
                  <AccountSettings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/notification-settings" 
              element={
                <ProtectedRoute>
                  <NotificationSettingsPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/app-settings" 
              element={
                <ProtectedRoute>
                  <AppSettings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/about" 
              element={
                <ProtectedRoute>
                  <About />
                </ProtectedRoute>
              } 
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
            </Routes>
            <GlobalPlayer />
          </AudioPlayerProvider>
          </SettingsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
