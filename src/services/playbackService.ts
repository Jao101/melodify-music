import { supabase } from "@/integrations/supabase/client";

// Test function to check if playback_state table is accessible
export async function testPlaybackState() {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      console.log('❌ No user logged in for playback state test');
      return false;
    }

    console.log('🧪 Testing playback_state table access...');
    
    // Try to select from the table
    const { data, error } = await (supabase as any)
      .from("playback_state")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (error) {
      console.error('❌ Playback state table access failed:', error);
      return false;
    }
    
    console.log('✅ Playback state table is accessible:', data);
    return true;
  } catch (error) {
    console.error('❌ Exception testing playback state:', error);
    return false;
  }
}

export async function getPlaybackState() {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      return null;
    }
    // use untyped table access until types are regenerated
    const { data, error } = await (supabase as any)
      .from("playback_state")
      .select("user_id, track_id, position, volume, queue_ids, updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      console.error('Failed to get playback state:', error);
      throw error;
    }
    return data as { user_id: string; track_id: string | null; position: number; volume?: number; queue_ids?: string[]; updated_at: string } | null;
  } catch (error) {
    console.error('Exception in getPlaybackState:', error);
    throw error;
  }
}

export async function upsertPlaybackState(trackId: string, position: number) {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Failed to get user for playback state:', userError);
      return;
    }
    
    const userId = userData.user?.id;
    if (!userId) {
      console.warn('No user ID found, skipping playback state save');
      return;
    }

    // Validate inputs
    if (!trackId || typeof position !== 'number' || !Number.isFinite(position)) {
      console.error('Invalid parameters for playback state:', { trackId, position });
      return;
    }

    const payload = {
      user_id: userId,
      track_id: trackId,
      position: Math.max(0, Math.floor(position)), // Ensure positive integer
      updated_at: new Date().toISOString(),
    };

    console.log('💾 Saving playback state for track:', trackId, 'at position:', Math.floor(position));

    const { error } = await (supabase as any)
      .from("playback_state")
      .upsert(payload, { onConflict: "user_id" });
    
    if (error) {
      // Check if it's a 404 error (table doesn't exist)
      if (error.code === 'PGRST106' || error.message?.includes('404') || error.message?.includes('not found')) {
        console.warn('🚨 playback_state table does not exist - DB persistence disabled');
        return; // Silently fail for missing table
      }
      
      console.error('Failed to save playback state:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }
  } catch (error) {
    // Check if it's a network 404 error or fetch failure
    if (error instanceof Error) {
      const errorMessage = error.message?.toLowerCase() || '';
      if (errorMessage.includes('404') || 
          errorMessage.includes('not found') || 
          errorMessage.includes('pgrst106') ||
          errorMessage.includes('relation') ||
          errorMessage.includes('does not exist')) {
        console.warn('🚨 playback_state table does not exist - DB persistence disabled');
        return; // Silently fail for missing table/endpoint
      }
    }
    
    // Also check for fetch errors that indicate missing endpoint
    if (error && typeof error === 'object' && 'error' in error) {
      const innerError = (error as any).error;
      if (innerError && (innerError.status === 404 || innerError.statusCode === 404)) {
        console.warn('🚨 playback_state endpoint not found - DB persistence disabled');
        return; // Silently fail for missing endpoint
      }
    }
    
    console.warn('⚠️ Failed to save playback state (non-critical):', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    // Don't throw - just log and continue (playback state is not critical)
    return;
  }
}

export async function setPlaybackVolume(volume: number) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return;
  const v = Math.max(0, Math.min(100, Math.round(volume)));
  const payload = {
    user_id: userId,
    volume: v,
    updated_at: new Date().toISOString(),
  };
  const { error } = await (supabase as any)
    .from("playback_state")
    .upsert(payload, { onConflict: "user_id" });
  if (error) throw error;
}

export async function setPlaybackQueue(queueIds: string[]) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return;
  const payload = {
    user_id: userId,
    queue_ids: queueIds,
    updated_at: new Date().toISOString(),
  };
  const { error } = await (supabase as any)
    .from("playback_state")
    .upsert(payload, { onConflict: "user_id" });
  if (error) throw error;
}
