// Alternative music metadata service using iTunes Search API
// iTunes API is free and doesn't require authentication

export interface iTunesTrackResult {
  trackName: string;
  artistName: string;
  collectionName: string;
  trackTimeMillis: number;
  releaseDate: string;
  primaryGenreName: string;
}

export interface iTunesSearchResponse {
  resultCount: number;
  results: iTunesTrackResult[];
}

export async function searchiTunesMetadata(
  title: string,
  artist?: string
): Promise<TrackMetadata[]> {
  try {
    // Clean search terms
    const cleanTitle = title.replace(/[^\w\s]/g, ' ').trim();
    const cleanArtist = artist?.replace(/[^\w\s]/g, ' ').trim();
    
    // Build search term
    let searchTerm = cleanTitle;
    if (cleanArtist && 
        cleanArtist !== 'Unknown Artist' && 
        cleanArtist !== 'Unbekannt' && 
        cleanArtist.trim() !== '') {
      searchTerm = `${cleanArtist} ${cleanTitle}`;
    }
    
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&media=music&entity=song&limit=10`;
    
    console.log('iTunes search URL:', url);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`iTunes API error: ${response.status}`);
    }
    
    const data: iTunesSearchResponse = await response.json();
    
    console.log('iTunes search results:', data);
    
    if (!data.results || data.results.length === 0) {
      return [];
    }
    
    // Convert iTunes results to our format
    const results: TrackMetadata[] = data.results.map(result => ({
      title: result.trackName || title,
      artist: result.artistName || 'Unknown Artist',
      album: result.collectionName,
      duration: result.trackTimeMillis ? Math.round(result.trackTimeMillis / 1000) : undefined,
      year: result.releaseDate ? new Date(result.releaseDate).getFullYear() : undefined,
      genre: result.primaryGenreName
    }));
    
    return results;
  } catch (error) {
    console.error('iTunes search error:', error);
    return [];
  }
}

export async function getBestiTunesMatch(
  title: string,
  artist?: string
): Promise<TrackMetadata | null> {
  const results = await searchiTunesMetadata(title, artist);
  
  if (results.length === 0) {
    return null;
  }
  
  // Return the first result (iTunes already sorts by relevance)
  return results[0];
}

import type { TrackMetadata } from './musicBrainzService';
