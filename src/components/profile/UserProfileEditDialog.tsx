import { useState, useEffect } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Save, X, Upload, Camera, AlertCircle } from "lucide-react";
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: any;
}

export function UserProfileEditDialog({ open, onOpenChange, profile }: UserProfileEditDialogProps) {
  const { refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [formChanged, setFormChanged] = useState(false);
  const [originalName, setOriginalName] = useState('');
  const [formData, setFormData] = useState({
    display_name: '',
    bio: '',
    website: '',
  });

  // Set initial form data when profile or open state changes
  useEffect(() => {
    if (profile && open) {
      setFormData({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        website: profile.website || '',
      });
      
      // Save original name for comparison
      setOriginalName(profile.display_name || '');
      
      if (profile.avatar_url) {
        setAvatarUrl(profile.avatar_url);
      }
      
      // Reset form changed state when opening
      setFormChanged(false);
    }
  }, [profile, open]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      // Mark form as changed
      if (prev[name as keyof typeof prev] !== value) {
        setFormChanged(true);
      }
      return { ...prev, [name]: value };
    });
  };

  // Handle avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || !e.target.files.length) return;
      
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${profile.id}/avatar.${fileExt}`;
      
      setUploading(true);
      
      // Upload image to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      setAvatarUrl(publicUrl);
      
      // Mark form as changed
      setFormChanged(true);
      
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile?.id) {
      toast.error('No profile found to update');
      return;
    }

    try {
      setLoading(true);
      
      // Prepare update data
      const updateData: Record<string, any> = {
        display_name: formData.display_name,
        bio: formData.bio,
        website: formData.website,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      };
      
      // Update profile in Supabase
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', profile.id);

      if (error) {
        console.error('Error updating profile:', error);
        throw error;
      }

      // Refresh profile data in context
      await refreshProfile();
      
      toast.success('Profile updated successfully');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(`Failed to update profile: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => {
      // Only allow closing via the X button or Cancel button
      if (value === false && open === true) {
        // If form was changed, ask for confirmation
        if (formChanged) {
          if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
            onOpenChange(false);
          }
          return;
        }
      }
      onOpenChange(value);
    }}>
      <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Edit Profile
          </DialogTitle>
          <DialogDescription>
            Update your profile information below. Use the Cancel button or X to close this dialog.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative group">
              <Avatar className="h-24 w-24 border-2 border-primary/20">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={formData.display_name || 'User'} />
                ) : (
                  <AvatarFallback className="bg-primary/10 text-lg">
                    {formData.display_name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                )}
              </Avatar>
              <label 
                htmlFor="avatar-upload" 
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
              >
                <Camera className="h-6 w-6 text-white" />
                <span className="sr-only">Upload avatar</span>
              </label>
              <Input 
                id="avatar-upload" 
                type="file" 
                accept="image/*" 
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploading} 
              />
            </div>
            {uploading && <p className="text-xs mt-2 text-muted-foreground">Uploading...</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="display_name">Display Name</Label>
            <Input
              id="display_name"
              name="display_name"
              placeholder="Your display name"
              value={formData.display_name}
              onChange={handleInputChange}
              className="bg-background"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Input
              id="bio"
              name="bio"
              placeholder="A short bio about yourself"
              value={formData.bio}
              onChange={handleInputChange}
              className="bg-background"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              name="website"
              type="url"
              placeholder="https://yourwebsite.com"
              value={formData.website}
              onChange={handleInputChange}
              className="bg-background"
            />
          </div>

          
          <DialogFooter className="pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                if (formChanged) {
                  if (window.confirm('You have unsaved changes. Are you sure you want to cancel?')) {
                    onOpenChange(false);
                  }
                } else {
                  onOpenChange(false);
                }
              }}
              disabled={loading}
              className="gap-2"
            >
              <X className="h-4 w-4" /> Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {loading ? 'Saving...' : (
                <>
                  <Save className="h-4 w-4" /> Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
