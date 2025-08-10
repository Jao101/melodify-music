import { supabase } from "@/integrations/supabase/client";

export async function getPlaybackState() {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return null;
  // use untyped table access until types are regenerated
  const { data, error } = await (supabase as any)
    .from("playback_state")
    .select("user_id, track_id, position, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as { user_id: string; track_id: string | null; position: number; updated_at: string } | null;
}

export async function upsertPlaybackState(trackId: string, position: number) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return;
  const payload = {
    user_id: userId,
    track_id: trackId,
    position,
    updated_at: new Date().toISOString(),
  };
  const { error } = await (supabase as any)
    .from("playback_state")
    .upsert(payload, { onConflict: "user_id" });
  if (error) throw error;
}
