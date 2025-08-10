import { useEffect } from 'react';

interface UseDocumentTitleProps {
  currentTrack?: {
    title: string;
    artist: string;
  } | null;
  isPlaying: boolean;
}

export function useDocumentTitle({ currentTrack, isPlaying }: UseDocumentTitleProps) {
  useEffect(() => {
    // If a track is playing, show the track name and artist in the title
    if (isPlaying && currentTrack) {
      const songTitle = `${currentTrack.title} - ${currentTrack.artist}`;
      document.title = `♪ ${songTitle} | Melodify Music`;
    } else {
      // When paused or no track selected, show default title
      document.title = 'Melodify Music';
    }
    
    // Cleanup function to reset title when component unmounts
    return () => {
      document.title = 'Melodify Music';
    };
  }, [currentTrack, isPlaying]);
}
