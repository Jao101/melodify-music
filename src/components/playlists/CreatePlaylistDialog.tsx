import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type PlaylistRow = Tables<'playlists'>;

interface CreatePlaylistDialogProps {
  mode?: "icon" | "button";
  // Passes back the created playlist; remains optional for backwards compatibility
  onCreated?: (playlist?: PlaylistRow) => void;
  className?: string;
}

export default function CreatePlaylistDialog({ mode = "icon", onCreated, className }: CreatePlaylistDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const disabled = !user || saving;

  const handleCreate = async () => {
    if (!user || !name.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("playlists")
      .insert({ owner_id: user.id, name: name.trim(), description: description.trim() || null })
      .select("*")
      .single();

    if (error) {
      toast({ title: "Fehler beim Erstellen", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Playlist erstellt", description: `"${data?.name}" wurde angelegt.` });
      setOpen(false);
      setName("");
      setDescription("");
      // Pass the created playlist back to the caller so it can preselect it
      onCreated?.(data as PlaylistRow);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === "icon" ? (
          <Button variant="outline" size="icon" className={className + " rounded-full"} disabled={!user}>
            <Plus className="h-4 w-4" />
          </Button>
        ) : (
          <Button className={className} disabled={!user}>
            <Plus className="h-4 w-4 mr-2" /> Playlist erstellen
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neue Playlist erstellen</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Name</label>
            <Input placeholder="z. B. Sommer Vibes" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Beschreibung (optional)</label>
            <Textarea placeholder="Kurze Beschreibung deiner Playlist" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Abbrechen</Button>
          <Button onClick={handleCreate} disabled={disabled || !name.trim()}>{saving ? "Erstellen..." : "Erstellen"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
