import { useEffect, useRef } from 'react';

interface UseDocumentTitleProps {
  currentTrack?: {
    title: string;
    artist: string;
  } | null;
  isPlaying: boolean;
}

export function useDocumentTitle({ currentTrack, isPlaying }: UseDocumentTitleProps) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // If a track is playing, show the track name and artist in the title
    if (isPlaying && currentTrack) {
      const songTitle = `${currentTrack.title} - ${currentTrack.artist}`;
      const prefix = '♪ ';
      const suffix = ' | Melodify Music';
      
      // Always create a scrolling marquee effect for playing tracks
      const separator = ' • • • '; // Visual separator between repeats
      const scrollText = songTitle + separator;
      let position = 0;
      
      const scroll = () => {
        // Create continuous scrolling text by repeating the content
        const repeatedText = scrollText.repeat(3); // Repeat 3 times to ensure smooth scrolling
        const visibleLength = 35; // How many characters to show at once
        
        // Get the current window of text
        let displayText = repeatedText.substring(position, position + visibleLength);
        
        // Move position forward for next frame
        position++;
        
        // Reset position when we've scrolled through one complete cycle
        if (position >= scrollText.length) {
          position = 0;
        }
        
        document.title = `${prefix}${displayText}${suffix}`;
      };
      
      // Start the scrolling animation
      scroll(); // Initial call
      intervalRef.current = setInterval(scroll, 500); // Slower scrolling for better readability
    } else {
      // When paused or no track selected, show default title
      document.title = 'Melodify Music';
    }
    
    // Cleanup function to reset title and clear interval when component unmounts
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      document.title = 'Melodify Music';
    };
  }, [currentTrack, isPlaying]);
}
