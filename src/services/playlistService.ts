import { supabase } from "@/integrations/supabase/client";

export async function addTrackToPlaylist(playlistId: string, trackId: string) {
  // Avoid duplicates
  const { data: existing, error: existingError } = await supabase
    .from("playlist_tracks")
    .select("id, position")
    .eq("playlist_id", playlistId)
    .eq("track_id", trackId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) {
    return { alreadyExists: true, data: existing } as const;
  }

  // Determine next position (count + 1)
  const { count, error: countError } = await supabase
    .from("playlist_tracks")
    .select("id", { count: "exact", head: true })
    .eq("playlist_id", playlistId);

  if (countError) throw countError;

  const position = (count ?? 0) + 1;

  const { data, error } = await supabase
    .from("playlist_tracks")
    .insert({ playlist_id: playlistId, track_id: trackId, position })
    .select("*")
    .single();

  if (error) throw error;
  return { alreadyExists: false, data } as const;
}
