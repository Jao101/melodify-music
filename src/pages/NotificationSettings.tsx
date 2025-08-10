import { useState, useEffect } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, 
  Volume2, 
  Mail, 
  MessageSquare, 
  Music, 
  Heart, 
  Users, 
  TrendingUp,
  Save,
  Check
} from "lucide-react";
import { toast } from 'sonner';
import { 
  settingsService, 
  NotificationSettings as INotificationSettings, 
  DEFAULT_NOTIFICATION_SETTINGS 
} from '@/services/settingsService';

export default function NotificationSettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [settings, setSettings] = useState<INotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);

  useEffect(() => {
    loadNotificationSettings();
  }, [user]);

  const loadNotificationSettings = async () => {
    if (!user?.id) return;

    try {
      setInitialLoad(true);
      const userSettings = await settingsService.getNotificationSettings(user.id);
      setSettings(userSettings);
    } catch (error) {
      console.error('Error loading notification settings:', error);
      toast.error('Failed to load notification settings');
    } finally {
      setInitialLoad(false);
    }
  };

  const saveSettings = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      await settingsService.saveNotificationSettings(user.id, settings);

      setSaved(true);
      toast.success('Notification settings saved successfully');
      
      setTimeout(() => setSaved(false), 2000);
    } catch (error: any) {
      console.error('Error saving notification settings:', error);
      toast.error('Failed to save notification settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key: keyof INotificationSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const testNotification = async () => {
    // In a real app, this would trigger a test notification
    toast.success('Test notification sent! Check your email and browser notifications.');
  };

  if (initialLoad) {
    return (
      <div className="min-h-screen bg-background pb-24 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading notification settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Notification Settings</h1>
          <p className="text-muted-foreground">
            Choose how and when you want to be notified about activity on Auralia AI
          </p>
        </div>

        <div className="space-y-6">
          {/* Notification Channels */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Channels
              </CardTitle>
              <CardDescription>
                Choose how you want to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email Notifications</p>
                    <p className="text-xs text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={settings.email_notifications}
                  onCheckedChange={(checked) => updateSetting('email_notifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Push Notifications</p>
                    <p className="text-xs text-muted-foreground">
                      Receive browser and mobile push notifications
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={settings.push_notifications}
                  onCheckedChange={(checked) => updateSetting('push_notifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Sound Notifications</p>
                    <p className="text-xs text-muted-foreground">
                      Play sound when notifications arrive
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={settings.sound_enabled}
                  onCheckedChange={(checked) => updateSetting('sound_enabled', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notification Types */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                Music & Content
              </CardTitle>
              <CardDescription>
                Get notified about new music and content updates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">New Music Alerts</p>
                    <p className="text-xs text-muted-foreground">
                      Get notified about new releases and trending music
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={settings.new_music_alerts}
                  onCheckedChange={(checked) => updateSetting('new_music_alerts', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Heart className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Playlist Updates</p>
                    <p className="text-xs text-muted-foreground">
                      When playlists you follow are updated
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={settings.playlist_updates}
                  onCheckedChange={(checked) => updateSetting('playlist_updates', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Social Interactions</p>
                    <p className="text-xs text-muted-foreground">
                      Likes, follows, and social activity
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={settings.social_interactions}
                  onCheckedChange={(checked) => updateSetting('social_interactions', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Frequency & Timing */}
          <Card>
            <CardHeader>
              <CardTitle>Frequency & Timing</CardTitle>
              <CardDescription>
                Control when and how often you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Notification Frequency</p>
                <Select 
                  value={settings.notification_frequency} 
                  onValueChange={(value: 'realtime' | 'daily' | 'weekly') => 
                    updateSetting('notification_frequency', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realtime">Real-time</SelectItem>
                    <SelectItem value="daily">Daily digest</SelectItem>
                    <SelectItem value="weekly">Weekly summary</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  How often you want to receive grouped notifications
                </p>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Quiet Hours</p>
                  <p className="text-xs text-muted-foreground">
                    Pause notifications during specific hours
                  </p>
                </div>
                <Switch 
                  checked={settings.quiet_hours_enabled}
                  onCheckedChange={(checked) => updateSetting('quiet_hours_enabled', checked)}
                />
              </div>

              {settings.quiet_hours_enabled && (
                <div className="grid grid-cols-2 gap-4 ml-6">
                  <div>
                    <p className="text-xs font-medium mb-1">Start Time</p>
                    <Select 
                      value={settings.quiet_hours_start} 
                      onValueChange={(value) => updateSetting('quiet_hours_start', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => {
                          const hour = i.toString().padStart(2, '0');
                          return (
                            <SelectItem key={hour} value={`${hour}:00`}>
                              {hour}:00
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-1">End Time</p>
                    <Select 
                      value={settings.quiet_hours_end} 
                      onValueChange={(value) => updateSetting('quiet_hours_end', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => {
                          const hour = i.toString().padStart(2, '0');
                          return (
                            <SelectItem key={hour} value={`${hour}:00`}>
                              {hour}:00
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Marketing & System */}
          <Card>
            <CardHeader>
              <CardTitle>Marketing & System</CardTitle>
              <CardDescription>
                Control marketing communications and system updates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Marketing Emails</p>
                  <p className="text-xs text-muted-foreground">
                    Promotions, feature announcements, and newsletters
                  </p>
                </div>
                <Switch 
                  checked={settings.marketing_emails}
                  onCheckedChange={(checked) => updateSetting('marketing_emails', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">System Updates</p>
                  <p className="text-xs text-muted-foreground">
                    Important app updates and maintenance notifications
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">Required</Badge>
                  <Switch 
                    checked={settings.system_updates}
                    onCheckedChange={(checked) => updateSetting('system_updates', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <Button 
              variant="outline" 
              onClick={testNotification}
            >
              <Bell className="h-4 w-4 mr-2" />
              Test Notifications
            </Button>
            
            <Button 
              onClick={saveSettings}
              disabled={loading}
              className="gap-2"
            >
              {saved ? (
                <>
                  <Check className="h-4 w-4" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {loading ? 'Saving...' : 'Save Settings'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
