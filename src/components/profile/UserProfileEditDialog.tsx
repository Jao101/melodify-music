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
  const [adminCode, setAdminCode] = useState('');
  const [showAdminCodeInput, setShowAdminCodeInput] = useState(false);
  const [nameChangeAllowed, setNameChangeAllowed] = useState(true);
  const [originalName, setOriginalName] = useState('');
  const [formData, setFormData] = useState({
    display_name: '',
    bio: '',
    website: '',
  });

  // Constants
  const NAME_CHANGE_DAYS = 14; // days before allowing another name change

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
      
      // Check if the user can change their name based on database fields
      checkNameChangePermission();
      
      // Reset form changed state when opening
      setFormChanged(false);
      setShowAdminCodeInput(false);
    }
  }, [profile, open]);
  
  // Check if the user is allowed to change their name using Supabase data
  const checkNameChangePermission = async () => {
    if (!profile?.id) return;
    
    try {
      // Get profile data with the last_name_change field
      const { data, error } = await supabase
        .from('profiles')
        .select('last_name_change, name_change_admin_override')
        .eq('id', profile.id)
        .single();
      
      if (error) {
        console.error('Error fetching profile data:', error);
        // If there's an error (perhaps fields don't exist yet), default to allowing name change
        setNameChangeAllowed(true);
        return;
      }
      
      // If admin override is active, always allow name change
      if (data.name_change_admin_override) {
        setNameChangeAllowed(true);
        return;
      }
      
      // If no previous name change, allow
      if (!data.last_name_change) {
        setNameChangeAllowed(true);
        return;
      }
      
      // Check if last change was more than NAME_CHANGE_DAYS ago
      const lastChange = new Date(data.last_name_change);
      const allowChangeDate = new Date();
      allowChangeDate.setDate(allowChangeDate.getDate() - NAME_CHANGE_DAYS);
      
      if (lastChange < allowChangeDate) {
        // Enough time has passed, allow name change
        setNameChangeAllowed(true);
      } else {
        // Not enough time has passed, disallow name change
        setNameChangeAllowed(false);
        
        // Calculate days remaining
        const nextAllowedDate = new Date(lastChange);
        nextAllowedDate.setDate(nextAllowedDate.getDate() + NAME_CHANGE_DAYS);
        const today = new Date();
        const diffTime = Math.abs(nextAllowedDate.getTime() - today.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        toast.info(`You can change your name again in ${diffDays} days. Use admin code to override.`);
      }
    } catch (err) {
      console.error('Error checking name change permission:', err);
      // Default to allowing on error
      setNameChangeAllowed(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Special handling for display name
    if (name === 'display_name' && !nameChangeAllowed && value !== originalName) {
      // Show admin code input if trying to change name when not allowed
      setShowAdminCodeInput(true);
    }
    
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

  // Verify admin code against the database
  const verifyAdminCode = async () => {
    if (!adminCode) {
      toast.error('Please enter an admin code.');
      return;
    }
    
    try {
      // First, check if app_constants table exists and has the admin code
      const { data, error } = await supabase
        .from('app_constants')
        .select('value')
        .eq('key', 'admin_name_change_code')
        .single();
      
      if (error) {
        console.error('Error fetching admin code:', error);
        
        // Fallback to hardcoded admin code if table doesn't exist
        if (adminCode === 'melodymaster2025') {
          await updateAdminOverride(true);
          return;
        } else {
          toast.error('Invalid admin code.');
          return;
        }
      }
      
      // Verify code from database
      if (data && data.value === adminCode) {
        await updateAdminOverride(true);
      } else {
        toast.error('Invalid admin code.');
      }
    } catch (err) {
      console.error('Error verifying admin code:', err);
      toast.error('Failed to verify admin code');
    }
  };
  
  // Update the admin override flag in the database
  const updateAdminOverride = async (override: boolean) => {
    try {
      // Try to update the name_change_admin_override field
      const { error } = await supabase
        .from('profiles')
        .update({ name_change_admin_override: override })
        .eq('id', profile.id);
      
      if (error) {
        console.error('Error updating admin override:', error);
        toast.error('Failed to apply admin override');
        return;
      }
      
      setNameChangeAllowed(true);
      toast.success('Admin code accepted. You can now change your name.');
      setShowAdminCodeInput(false);
    } catch (err) {
      console.error('Error updating admin override:', err);
      toast.error('Failed to apply admin override');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile?.id) {
      toast.error('No profile found to update');
      return;
    }
    
    // Check if the display name is being changed
    const isNameChanged = formData.display_name !== originalName;
    
    // If trying to change name but not allowed and admin code not provided
    if (isNameChanged && !nameChangeAllowed && !showAdminCodeInput) {
      setShowAdminCodeInput(true);
      toast.info('Enter admin code to change your name before the 2-week period');
      return;
    }
    
    // If showing admin code input but admin code not verified
    if (isNameChanged && !nameChangeAllowed && showAdminCodeInput) {
      toast.error('Please verify the admin code first or reset your display name');
      return;
    }

    try {
      setLoading(true);
      
      // Prepare update data
      const updateData: Record<string, any> = {
        bio: formData.bio,
        website: formData.website,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      };
      
      // Only include display name if it's changed and allowed
      if (isNameChanged && nameChangeAllowed) {
        updateData.display_name = formData.display_name;
        
        // If changing name, also update last_name_change timestamp
        try {
          // Check if the field exists in the database first
          const { data, error } = await supabase
            .from('profiles')
            .select('last_name_change')
            .eq('id', profile.id)
            .single();
            
          if (!error) {
            // Field exists, update it
            updateData.last_name_change = new Date().toISOString();
          }
        } catch (err) {
          console.error('Error checking last_name_change field:', err);
        }
      } else if (!isNameChanged) {
        // If name not changed, still include it in the update
        updateData.display_name = formData.display_name;
      }
      
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
            <div className="flex items-center justify-between">
              <Label htmlFor="display_name">Display Name</Label>
              {!nameChangeAllowed && (
                <span className="text-xs text-yellow-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Name change restricted
                </span>
              )}
            </div>
            <Input
              id="display_name"
              name="display_name"
              placeholder="Your display name"
              value={formData.display_name}
              onChange={handleInputChange}
              className={`bg-background ${!nameChangeAllowed && formData.display_name !== originalName ? 'border-yellow-500' : ''}`}
            />
            {!nameChangeAllowed && formData.display_name !== originalName && !showAdminCodeInput && (
              <p className="text-xs text-yellow-500">
                You can only change your name once every 2 weeks. Use an admin code to override.
              </p>
            )}
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

          {showAdminCodeInput && (
            <div className="space-y-2 border-t border-border pt-4 mt-4">
              <Label htmlFor="admin_code">Admin Code</Label>
              <div className="flex gap-2">
                <Input
                  id="admin_code"
                  name="admin_code"
                  type="password"
                  placeholder="Enter admin code"
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  className="bg-background"
                />
                <Button 
                  type="button"
                  onClick={verifyAdminCode}
                  className="bg-primary"
                >
                  Verify
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Contact an administrator for the code to change your name before the 2-week period.
              </p>
            </div>
          )}
          
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
              disabled={loading || (!nameChangeAllowed && formData.display_name !== originalName && showAdminCodeInput)}
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
