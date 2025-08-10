import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Music, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { enhanceAndSaveTrack, isTrackEnhanced } from '@/services/musicBrainzService';

interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string | null;
}

interface MetadataEnhancerButtonProps {
  tracks: Track[];
  onUpdateTracks?: () => void;
}

export const MetadataEnhancerButton: React.FC<MetadataEnhancerButtonProps> = ({ 
  tracks, 
  onUpdateTracks 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleEnhanceMetadata = async () => {
    if (!tracks || tracks.length === 0) {
      toast({
        title: "Keine Tracks gefunden",
        description: "Es sind keine Tracks zum Verbessern verfügbar.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    let enhancedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    try {
      toast({
        title: "Metadaten werden verbessert",
        description: `Verarbeite ${tracks.length} Tracks...`,
      });

      // Process tracks in batches to respect API rate limits
      const BATCH_SIZE = 3;
      const DELAY_BETWEEN_REQUESTS = 1000; // 1 second

      for (let i = 0; i < tracks.length; i += BATCH_SIZE) {
        const batch = tracks.slice(i, i + BATCH_SIZE);
        
        // Process batch in parallel
        const batchPromises = batch.map(async (track) => {
          try {
            // Check if track is already enhanced
            const alreadyEnhanced = await isTrackEnhanced(track.id);
            if (alreadyEnhanced) {
              skippedCount++;
              return;
            }

            // Enhance and save track
            const success = await enhanceAndSaveTrack(track.id);
            if (success) {
              enhancedCount++;
            } else {
              errorCount++;
            }
          } catch (error) {
            console.error(`Error enhancing track ${track.id}:`, error);
            errorCount++;
          }
        });

        await Promise.all(batchPromises);

        // Add delay between batches (except for the last batch)
        if (i + BATCH_SIZE < tracks.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
        }
      }

      // Show results
      toast({
        title: "Metadaten-Verbesserung abgeschlossen",
        description: `${enhancedCount} verbessert, ${skippedCount} übersprungen, ${errorCount} Fehler`,
        variant: enhancedCount > 0 ? "default" : "destructive",
      });

      // Refresh tracks if any were enhanced
      if (enhancedCount > 0 && onUpdateTracks) {
        onUpdateTracks();
      }

    } catch (error) {
      console.error('Error in batch processing:', error);
      toast({
        title: "Fehler beim Verbessern",
        description: "Ein unerwarteter Fehler ist aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button 
      onClick={handleEnhanceMetadata}
      disabled={isProcessing || !tracks || tracks.length === 0}
      className="w-full sm:w-auto"
      variant="outline"
    >
      {isProcessing ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Music className="mr-2 h-4 w-4" />
      )}
      {isProcessing 
        ? "Verbessere Metadaten..." 
        : `Metadaten verbessern (${tracks?.length || 0} Tracks)`
      }
    </Button>
  );
};