import { searchTrackMetadata, getBestTrackMatch, enhanceTrackMetadata } from '@/services/musicBrainzService';

// Test function - can be called from browser console: window.testMusicBrainz()
export async function testMusicBrainz() {
  console.log('Testing MusicBrainz API...');
  
  try {
    // Test with a popular song
    const results = await searchTrackMetadata('Bohemian Rhapsody', 'Queen');
    console.log('Search results for "Bohemian Rhapsody" by Queen:', results);
    
    // Test with just a title
    const results2 = await searchTrackMetadata('Imagine');
    console.log('Search results for "Imagine":', results2);
    
    // Test getBestTrackMatch
    const bestMatch = await getBestTrackMatch('Hotel California', 'Eagles');
    console.log('Best match for "Hotel California" by Eagles:', bestMatch);
    
    // Test enhancement
    const enhanced = await enhanceTrackMetadata({ title: 'Yesterday', artist: 'Unknown Artist' });
    console.log('Enhanced metadata for "Yesterday":', enhanced);
    
    console.log('✅ MusicBrainz API test completed successfully!');
    return { results, results2, bestMatch, enhanced };
  } catch (error) {
    console.error('❌ MusicBrainz API test failed:', error);
    return { error };
  }
}

// Make it available globally for testing
if (typeof window !== 'undefined') {
  (window as any).testMusicBrainz = testMusicBrainz;
}
