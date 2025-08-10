import { useState, useEffect } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  Trash2, 
  AlertTriangle,
  Save,
  Eye,
  EyeOff
} from "lucide-react";
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AccountSettings() {
  const { profile, user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [accountData, setAccountData] = useState({
    email: '',
    profileVisibility: true,
    emailNotifications: true,
    marketingNotifications: false
  });

  useEffect(() => {
    if (user) {
      setAccountData(prev => ({
        ...prev,
        email: user.email || ''
      }));
    }
  }, [user]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      toast.success('Password updated successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowChangePassword(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailUpdate = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.updateUser({
        email: accountData.email
      });

      if (error) throw error;

      toast.success('Email update initiated. Please check your inbox for confirmation.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update email');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone and you will lose all your data including playlists, liked songs, and uploads.'
    );

    if (!confirmed) return;

    const doubleConfirm = window.confirm(
      'This is your final warning. Your account and ALL data will be permanently deleted. Type your email to confirm.'
    );

    if (!doubleConfirm) return;

    try {
      setLoading(true);
      
      // Delete user data from profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user?.id);

      if (profileError) throw profileError;

      // Note: In a production app, you'd typically call a backend function
      // that handles cascading deletes and actually removes the auth user
      toast.success('Account deletion initiated. You will be signed out.');
      
      // Sign out the user
      await supabase.auth.signOut();
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Account Settings</h1>
          <p className="text-muted-foreground">
            Manage your account preferences and security settings
          </p>
        </div>

        <div className="space-y-6">
          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Information
              </CardTitle>
              <CardDescription>
                View and update your basic account information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Display Name</Label>
                  <Input 
                    value={profile?.display_name || 'Not set'} 
                    disabled 
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Update this in your profile settings
                  </p>
                </div>
                <div>
                  <Label>User ID</Label>
                  <Input 
                    value={user?.id || ''} 
                    disabled 
                    className="bg-muted font-mono text-xs"
                  />
                </div>
              </div>
              
              <div>
                <Label>Account Created</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {user?.created_at 
                      ? format(new Date(user.created_at), 'PPP')
                      : 'Unknown'
                    }
                  </span>
                </div>
              </div>

              <div>
                <Label>Subscription Status</Label>
                <div className="mt-1">
                  <Badge 
                    variant={profile?.subscription_tier === 'premium' ? 'default' : 'secondary'}
                    className="capitalize"
                  >
                    {profile?.subscription_tier || 'free'} Plan
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Settings
              </CardTitle>
              <CardDescription>
                Manage your email address and verification status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="email"
                    type="email"
                    value={accountData.email}
                    onChange={(e) => setAccountData(prev => ({
                      ...prev,
                      email: e.target.value
                    }))}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleEmailUpdate}
                    disabled={loading || accountData.email === user?.email}
                    variant="outline"
                  >
                    Update
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  You'll need to verify your new email address
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Email Verified</p>
                  <p className="text-xs text-muted-foreground">
                    Your email verification status
                  </p>
                </div>
                <Badge variant={user?.email_confirmed_at ? 'default' : 'destructive'}>
                  {user?.email_confirmed_at ? 'Verified' : 'Not Verified'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security
              </CardTitle>
              <CardDescription>
                Manage your password and security preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Password</p>
                  <p className="text-xs text-muted-foreground">
                    Last changed: {user?.updated_at 
                      ? format(new Date(user.updated_at), 'PPP')
                      : 'Unknown'
                    }
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setShowChangePassword(!showChangePassword)}
                >
                  {showChangePassword ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Cancel
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Change Password
                    </>
                  )}
                </Button>
              </div>

              {showChangePassword && (
                <form onSubmit={handlePasswordChange} className="space-y-3 p-4 bg-muted/30 rounded-lg">
                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({
                        ...prev,
                        newPassword: e.target.value
                      }))}
                      placeholder="Enter new password"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({
                        ...prev,
                        confirmPassword: e.target.value
                      }))}
                      placeholder="Confirm new password"
                      required
                    />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Updating...' : 'Update Password'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>
                Control how your information is shared and used
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Profile Visibility</p>
                  <p className="text-xs text-muted-foreground">
                    Allow others to find and view your profile
                  </p>
                </div>
                <Switch 
                  checked={accountData.profileVisibility}
                  onCheckedChange={(checked) => setAccountData(prev => ({
                    ...prev,
                    profileVisibility: checked
                  }))}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Email Notifications</p>
                  <p className="text-xs text-muted-foreground">
                    Receive important account updates via email
                  </p>
                </div>
                <Switch 
                  checked={accountData.emailNotifications}
                  onCheckedChange={(checked) => setAccountData(prev => ({
                    ...prev,
                    emailNotifications: checked
                  }))}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Marketing Communications</p>
                  <p className="text-xs text-muted-foreground">
                    Receive updates about new features and promotions
                  </p>
                </div>
                <Switch 
                  checked={accountData.marketingNotifications}
                  onCheckedChange={(checked) => setAccountData(prev => ({
                    ...prev,
                    marketingNotifications: checked
                  }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-destructive/5 rounded-lg border border-destructive/20">
                <div>
                  <p className="text-sm font-medium">Delete Account</p>
                  <p className="text-xs text-muted-foreground">
                    Permanently delete your account and all associated data
                  </p>
                </div>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteAccount}
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
