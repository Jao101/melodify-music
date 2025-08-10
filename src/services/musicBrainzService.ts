import { MusicBrainzApi } from 'musicbrainz-api';
import { supabase } from '@/integrations/supabase/client';

const mbApi = new MusicBrainzApi({
  appName: 'melodify-music',
  appVersion: '1.0.0',
  appContactInfo: 'melodify@example.com'
});

export interface TrackMetadata {
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  year?: number;
  genre?: string;
}

export interface MusicBrainzSearchResult {
  score: number;
  metadata: TrackMetadata;
  mbid?: string; // MusicBrainz ID
}

/**
 * Search for track metadata using title and artist
 */
export async function searchTrackMetadata(
  title: string, 
  artist?: string
): Promise<MusicBrainzSearchResult[]> {
  try {
    // Clean up search terms
    const cleanTitle = title.replace(/[^\w\s]/g, '').trim();
    const cleanArtist = artist?.replace(/[^\w\s]/g, '').trim();
    
    // Build search query
    let query = `recording:"${cleanTitle}"`;
    if (cleanArtist && cleanArtist !== 'Unknown Artist' && cleanArtist !== 'Unbekannt') {
      query += ` AND artist:"${cleanArtist}"`;
    }
    
    console.log('MusicBrainz search query:', query);
    
    // Search recordings
    const searchResult = await mbApi.search('recording', {
      query: query,
      limit: 10,
      offset: 0
    });
    
    if (!searchResult.recordings || searchResult.recordings.length === 0) {
      // Fallback: search with just title if no results
      const fallbackResult = await mbApi.search('recording', {
        query: `recording:"${cleanTitle}"`,
        limit: 5,
        offset: 0
      });
      
      if (!fallbackResult.recordings) {
        return [];
      }
      
      return fallbackResult.recordings.map(recording => ({
        score: recording.score || 0,
        metadata: {
          title: recording.title || title,
          artist: recording['artist-credit']?.[0]?.artist?.name || 'Unknown Artist',
          album: recording.releases?.[0]?.title,
          duration: recording.length ? Math.round(recording.length / 1000) : undefined,
          year: recording.releases?.[0]?.date ? new Date(recording.releases[0].date).getFullYear() : undefined
        },
        mbid: recording.id
      }));
    }
    
    // Process results
    const results: MusicBrainzSearchResult[] = searchResult.recordings.map(recording => {
      const artistName = recording['artist-credit']?.[0]?.artist?.name || 'Unknown Artist';
      const albumTitle = recording.releases?.[0]?.title;
      const releaseDate = recording.releases?.[0]?.date;
      const duration = recording.length ? Math.round(recording.length / 1000) : undefined;
      
      return {
        score: recording.score || 0,
        metadata: {
          title: recording.title || title,
          artist: artistName,
          album: albumTitle,
          duration: duration,
          year: releaseDate ? new Date(releaseDate).getFullYear() : undefined
        },
        mbid: recording.id
      };
    });
    
    // Sort by score (higher is better)
    return results.sort((a, b) => b.score - a.score);
    
  } catch (error) {
    console.error('MusicBrainz search error:', error);
    return [];
  }
}

/**
 * Get the best match for a track
 */
export async function getBestTrackMatch(
  title: string, 
  artist?: string
): Promise<TrackMetadata | null> {
  const results = await searchTrackMetadata(title, artist);
  
  if (results.length === 0) {
    return null;
  }
  
  // Return the best match (highest score)
  const bestMatch = results[0];
  
  // Only return if score is reasonable (above 70)
  if (bestMatch.score >= 70) {
    return bestMatch.metadata;
  }
  
  return null;
}

/**
 * Enhance track metadata by searching MusicBrainz
 */
export async function enhanceTrackMetadata(track: {
  title: string;
  artist?: string;
  album?: string;
}): Promise<TrackMetadata> {
  // If we already have good metadata, return as is
  if (track.artist && 
      track.artist !== 'Unknown Artist' && 
      track.artist !== 'Unbekannt' && 
      track.artist.trim() !== '') {
    return {
      title: track.title,
      artist: track.artist,
      album: track.album
    };
  }
  
  // Search for better metadata
  const enhancedMetadata = await getBestTrackMatch(track.title, track.artist);
  
  if (enhancedMetadata) {
    return enhancedMetadata;
  }
  
  // Return original if no enhancement found
  return {
    title: track.title,
    artist: track.artist || 'Unknown Artist',
    album: track.album
  };
}

/**
 * Save enhanced metadata to the database
 */
export async function saveEnhancedMetadata(
  trackId: string,
  originalData: TrackMetadata,
  enhancedData: TrackMetadata
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('tracks')
      .update({
        title: enhancedData.title,
        artist: enhancedData.artist,
        album: enhancedData.album,
        // Store original data in metadata JSON for now until migration is applied
        metadata: {
          original_title: originalData.title,
          original_artist: originalData.artist,
          enhanced_at: new Date().toISOString(),
          enhancement_source: 'musicbrainz'
        }
      })
      .eq('id', trackId);

    if (error) {
      console.error('Error saving enhanced metadata:', error);
      return false;
    }

    console.log('Enhanced metadata saved successfully for track:', trackId);
    return true;
  } catch (error) {
    console.error('Exception saving enhanced metadata:', error);
    return false;
  }
}

/**
 * Check if track has been enhanced
 */
export async function isTrackEnhanced(trackId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('tracks')
      .select('metadata')
      .eq('id', trackId)
      .single();

    if (error) {
      console.error('Error checking enhancement status:', error);
      return false;
    }

    // Check if metadata contains enhancement info
    const metadata = data?.metadata as any;
    return metadata?.enhanced_at !== null && metadata?.enhanced_at !== undefined;
  } catch (error) {
    console.error('Exception checking enhancement status:', error);
    return false;
  }
}

/**
 * Enhance track metadata and save to database
 */
export async function enhanceAndSaveTrack(trackId: string): Promise<boolean> {
  try {
    // Get current track data
    const { data: track, error: fetchError } = await supabase
      .from('tracks')
      .select('*')
      .eq('id', trackId)
      .single();

    if (fetchError || !track) {
      console.error('Error fetching track:', fetchError);
      return false;
    }

    // Check if already enhanced
    const metadata = track.metadata as any;
    if (metadata?.enhanced_at) {
      console.log('Track already enhanced:', trackId);
      return true;
    }

    // Store original metadata
    const originalData: TrackMetadata = {
      title: track.title,
      artist: track.artist,
      album: track.album || undefined,
      duration: track.duration,
      genre: track.genre || undefined
    };

    // Enhance metadata
    const enhancedData = await enhanceTrackMetadata(originalData);

    // Save to database if enhancement was successful
    const saved = await saveEnhancedMetadata(trackId, originalData, enhancedData);
    
    return saved;
  } catch (error) {
    console.error('Exception enhancing and saving track:', error);
    return false;
  }
}
