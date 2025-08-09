import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type UserPlaylist = {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  is_public: boolean | null;
  created_at: string;
  updated_at: string;
  owner_id: string;
};

export function useUserPlaylists() {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlaylists = useCallback(async () => {
    if (!user) {
      setPlaylists([]);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("playlists")
      .select("*")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setPlaylists((data as UserPlaylist[]) || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  return {
    playlists,
    loading,
    error,
    refetch: fetchPlaylists,
  } as const;
}
