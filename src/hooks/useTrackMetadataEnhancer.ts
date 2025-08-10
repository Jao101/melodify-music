import { useState, useCallback } from 'react';
import { enhanceTrackMetadata, type TrackMetadata } from '@/services/musicBrainzService';

export function useTrackMetadataEnhancer() {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancedTracks, setEnhancedTracks] = useState<Map<string, TrackMetadata>>(new Map());

  const enhanceTrack = useCallback(async (track: {
    id: string;
    title: string;
    artist?: string;
    album?: string;
  }): Promise<TrackMetadata | null> => {
    // Check if we already enhanced this track
    const cached = enhancedTracks.get(track.id);
    if (cached) {
      return cached;
    }

    // Skip if already has good metadata
    if (track.artist && 
        track.artist !== 'Unknown Artist' && 
        track.artist !== 'Unbekannt' && 
        track.artist.trim() !== '') {
      const metadata: TrackMetadata = {
        title: track.title,
        artist: track.artist,
        album: track.album
      };
      setEnhancedTracks(prev => new Map(prev).set(track.id, metadata));
      return metadata;
    }

    setIsEnhancing(true);
    
    try {
      const enhanced = await enhanceTrackMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album
      });

      // Cache the result
      setEnhancedTracks(prev => new Map(prev).set(track.id, enhanced));
      
      return enhanced;
    } catch (error) {
      console.error('Failed to enhance track metadata:', error);
      return null;
    } finally {
      setIsEnhancing(false);
    }
  }, [enhancedTracks]);

  const getEnhancedTrack = useCallback((trackId: string): TrackMetadata | null => {
    return enhancedTracks.get(trackId) || null;
  }, [enhancedTracks]);

  const enhanceMultipleTracks = useCallback(async (tracks: Array<{
    id: string;
    title: string;
    artist?: string;
    album?: string;
  }>) => {
    setIsEnhancing(true);
    
    const results = new Map<string, TrackMetadata>();
    
    // Process tracks in batches to avoid overwhelming the API
    const batchSize = 3;
    for (let i = 0; i < tracks.length; i += batchSize) {
      const batch = tracks.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (track) => {
        // Skip if already enhanced
        if (enhancedTracks.has(track.id)) {
          return;
        }

        try {
          const enhanced = await enhanceTrackMetadata({
            title: track.title,
            artist: track.artist,
            album: track.album
          });
          results.set(track.id, enhanced);
        } catch (error) {
          console.error(`Failed to enhance track ${track.title}:`, error);
        }
      });

      await Promise.all(batchPromises);
      
      // Small delay between batches to be respectful to the API
      if (i + batchSize < tracks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Update state with all results
    setEnhancedTracks(prev => {
      const newMap = new Map(prev);
      results.forEach((metadata, trackId) => {
        newMap.set(trackId, metadata);
      });
      return newMap;
    });

    setIsEnhancing(false);
    return results;
  }, [enhancedTracks]);

  return {
    enhanceTrack,
    getEnhancedTrack,
    enhanceMultipleTracks,
    isEnhancing,
    enhancedTracksCount: enhancedTracks.size
  };
}
