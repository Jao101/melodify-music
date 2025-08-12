// Temporary stub for playback service to avoid Supabase dependency
// This provides local-only functionality

export async function getPlaybackState(trackId: string) {
  // Return null - no saved state
  return null;
}

export async function upsertPlaybackState(trackId: string, position: number) {
  // Do nothing - just return success
  console.log('📍 Local playback position:', trackId, position);
  return { success: true };
}

export async function testPlaybackState() {
  // Return success - no actual test needed
  return { success: true };
}

export async function setPlaybackQueue(trackIds: string[]) {
  // Do nothing - just return success
  console.log('🎵 Local queue update:', trackIds.length, 'tracks');
  return { success: true };
}
