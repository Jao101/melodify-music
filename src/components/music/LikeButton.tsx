import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLikedTracks } from "@/hooks/useLikedTracks";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface LikeButtonProps {
  trackId: string;
  size?: "sm" | "md" | "lg";
  variant?: "ghost" | "outline" | "secondary";
}

export function LikeButton({ trackId, size = "md", variant = "ghost" }: LikeButtonProps) {
  const { user } = useAuth();
  const { isLiked, toggleLike } = useLikedTracks();
  const { toast } = useToast();

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      toast({
        title: "Sign in required",
        description: "You need to sign in to like songs.",
        variant: "destructive",
      });
      return;
    }

    try {
      await toggleLike(trackId);
      
      toast({
        title: isLiked(trackId) ? "Removed from Liked Songs" : "Added to Liked Songs",
        description: isLiked(trackId) ? "Song has been removed from your library" : "Song has been saved to your library",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const iconSize = {
    sm: "h-3 w-3",
    md: "h-4 w-4", 
    lg: "h-5 w-5"
  }[size];

  const buttonSize = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10"
  }[size];

  const liked = isLiked(trackId);

  return (
    <Button
      variant={variant}
      size="icon"
      className={`${buttonSize} hover:bg-secondary/70 transition-colors ${
        liked ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground hover:text-foreground'
      }`}
      onClick={handleClick}
    >
      <Heart 
        className={`${iconSize} transition-colors ${
          liked ? 'fill-current' : ''
        }`} 
      />
    </Button>
  );
}