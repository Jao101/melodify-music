import { useState } from "react";
import { addTrackToPlaylist } from "@/services/playlistService";
import { useToast } from "@/hooks/use-toast";

export function useAddToPlaylist() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const addToPlaylist = async (playlistId: string, trackId: string) => {
    try {
      setLoading(true);
      const result = await addTrackToPlaylist(playlistId, trackId);
      
      if (result.alreadyExists) {
        toast({ 
          title: "Schon vorhanden", 
          description: "Dieser Song ist bereits in der Playlist." 
        });
      } else {
        toast({ 
          title: "Hinzugefügt", 
          description: "Song wurde zur Playlist hinzugefügt." 
        });
      }
      
      return result;
    } catch (e: any) {
      toast({ 
        title: "Fehler", 
        description: e.message, 
        variant: "destructive" 
      });
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { addToPlaylist, loading };
}