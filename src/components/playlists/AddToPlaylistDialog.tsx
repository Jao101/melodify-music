import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useUserPlaylists } from "@/hooks/useUserPlaylists";
import CreatePlaylistDialog from "@/components/playlists/CreatePlaylistDialog";
import { usePlaylistTracks } from "@/hooks/usePlaylistTracks";
import { Plus, ListPlus } from "lucide-react";

interface AddToPlaylistDialogProps {
  trackId: string;
  onAdded?: () => void;
  trigger?: React.ReactNode;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function AddToPlaylistDialog({ 
  trackId, 
  onAdded, 
  trigger, 
  className, 
  open: controlledOpen, 
  onOpenChange: controlledOnOpenChange 
}: AddToPlaylistDialogProps) {
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>("");
  const { playlists, refetch, loading } = useUserPlaylists();
  const { addTrack, loading: saving } = usePlaylistTracks();

  useEffect(() => {
    if (!open) {
      setSelectedPlaylistId("");
    }
  }, [open]);

  const defaultTrigger = (
    <Button variant="outline" size="sm" className={className}>
      <ListPlus className="h-4 w-4 mr-2" /> Zur Playlist hinzufügen
    </Button>
  );

  const handleAdd = async () => {
    if (!selectedPlaylistId) return;
    try {
      const result = await addTrack(selectedPlaylistId, trackId);
      if (result.alreadyExists) {
        toast({ title: "Schon vorhanden", description: "Dieser Song ist bereits in der Playlist." });
      } else {
        toast({ title: "Hinzugefügt", description: "Song wurde zur Playlist hinzugefügt." });
      }
      setOpen(false);
      onAdded?.();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      toast({ title: "Fehler", description: message, variant: "destructive" });
    }
  };

  const hasPlaylists = (playlists?.length ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? defaultTrigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Zur Playlist hinzufügen</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {hasPlaylists ? (
            <div>
              <label className="block text-sm font-medium mb-2">Playlist auswählen</label>
              <Select value={selectedPlaylistId} onValueChange={setSelectedPlaylistId}>
                <SelectTrigger>
                  <SelectValue placeholder={loading ? "Lade Playlists..." : "Wähle eine Playlist"} />
                </SelectTrigger>
                <SelectContent>
                  {playlists.map((pl) => (
                    <SelectItem key={pl.id} value={pl.id}>{pl.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Du hast noch keine Playlists. Erstelle jetzt eine neue.</p>
          )}

          <div className="pt-2">
            <CreatePlaylistDialog
              mode="button"
              className="w-full"
              onCreated={async () => {
                await refetch();
                if (playlists && playlists.length > 0) {
                  // Preselect the most recent
                  setSelectedPlaylistId(playlists[0].id);
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Abbrechen</Button>
          <Button onClick={handleAdd} disabled={!selectedPlaylistId || saving}>{saving ? "Hinzufügen..." : "Hinzufügen"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
