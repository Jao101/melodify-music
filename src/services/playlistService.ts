import { supabase } from "@/integrations/supabase/client";

// Marker placed in description to reliably identify the special uploads playlist
const SYSTEM_UPLOADS_MARKER = "[system_uploads]";

export function getUploadsPlaylistName(locale?: string) {
  const lang = (locale || (typeof navigator !== 'undefined' ? navigator.language : 'en')).toLowerCase();
  if (lang.startsWith('de')) return 'Hochgeladene Songs';
  if (lang.startsWith('fr')) return 'Morceaux téléversés';
  if (lang.startsWith('es')) return 'Canciones subidas';
  if (lang.startsWith('it')) return 'Canzoni caricate';
  if (lang.startsWith('tr')) return 'Yüklenen Şarkılar';
  if (lang.startsWith('nl')) return 'Geüploade nummers';
  if (lang.startsWith('pl')) return 'Przesłane utwory';
  if (lang.startsWith('pt')) return 'Músicas enviadas';
  if (lang.startsWith('ru')) return 'Загруженные песни';
  return 'Uploaded Songs';
}

export async function ensureUploadsPlaylist(ownerId: string, locale?: string) {
  // Try find by description marker first
  const { data: existing, error: findError } = await supabase
    .from('playlists')
    .select('id, name, description')
    .eq('owner_id', ownerId)
    .ilike('description', `%${SYSTEM_UPLOADS_MARKER}%`)
    .maybeSingle();

  if (findError && findError.code !== 'PGRST116') {
    // PGRST116 is "Results contain 0 rows" for maybeSingle; ignore
    throw findError;
  }

  if (existing) return existing;

  // Not found, create
  const name = getUploadsPlaylistName(locale);
  const { data: created, error: createError } = await supabase
    .from('playlists')
    .insert({
      name,
      owner_id: ownerId,
      is_public: false,
      description: `${SYSTEM_UPLOADS_MARKER} Auto playlist of your uploads`,
    })
    .select('id, name, description')
    .single();

  if (createError) throw createError;
  return created!;
}

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

export async function removeTrackFromPlaylist(playlistId: string, trackId: string) {
  const { error } = await supabase
    .from("playlist_tracks")
    .delete()
    .eq("playlist_id", playlistId)
    .eq("track_id", trackId);

  if (error) throw error;
  return { success: true } as const;
}

export async function deletePlaylist(playlistId: string) {
  const { error } = await supabase
    .from("playlists")
    .delete()
    .eq("id", playlistId);

  if (error) throw error;
  return { success: true } as const;
}
