import { useState } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { useAppSettings } from "@/contexts/SettingsContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { 
  Settings as SettingsIcon, 
  Volume2, 
  Monitor, 
  Palette, 
  Globe, 
  Download, 
  HardDrive,
  Wifi,
  Battery,
  Save,
  RotateCcw,
  Check
} from "lucide-react";
import { toast } from 'sonner';
import { settingsService } from '@/services/settingsService';

export default function AppSettings() {
  const { user } = useAuth();
  const { appSettings, updateAppSettings, resetAppSettings } = useAppSettings();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSettingChange = async (key: string, value: any) => {
    try {
      await updateAppSettings({ [key]: value });
      
      // Show temporary success indication
      setSaved(true);
      setTimeout(() => setSaved(false), 1000);
    } catch (error) {
      console.error('Error updating setting:', error);
    }
  };

  const handleResetSettings = async () => {
    try {
      setLoading(true);
      await resetAppSettings();
    } catch (error) {
      console.error('Error resetting settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearCache = async () => {
    try {
      await settingsService.clearCache();
      toast.success('Cache cleared successfully');
    } catch (error) {
      toast.error('Failed to clear cache');
    }
  };

  const exportSettings = async () => {
    if (!user?.id) return;
    
    try {
      const exportData = await settingsService.exportSettings(user.id);
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'auralia_settings.json';
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Settings exported successfully');
    } catch (error) {
      toast.error('Failed to export settings');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">App Settings</h1>
          <p className="text-muted-foreground">
            Customize your Auralia AI experience
          </p>
        </div>

        <div className="space-y-6">
          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>
                Customize the look and feel of the app
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Theme</p>
                <Select 
                  value={appSettings.theme} 
                  onValueChange={(value: 'light' | 'dark' | 'system') => {
                    handleSettingChange('theme', value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System Default</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Choose your preferred color scheme
                </p>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Language</p>
                <Select 
                  value={appSettings.language} 
                  onValueChange={(value) => handleSettingChange('language', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="it">Italiano</SelectItem>
                    <SelectItem value="pt">Português</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Select your preferred language
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Audio Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="h-5 w-5" />
                Audio Quality
              </CardTitle>
              <CardDescription>
                Configure audio playback and quality settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Streaming Quality</p>
                <Select 
                  value={appSettings.audio_quality} 
                  onValueChange={(value: 'low' | 'medium' | 'high' | 'lossless') => 
                    handleSettingChange('audio_quality', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low (96 kbps)</SelectItem>
                    <SelectItem value="medium">Medium (160 kbps)</SelectItem>
                    <SelectItem value="high">High (320 kbps)</SelectItem>
                    <SelectItem value="lossless">Lossless (FLAC)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Higher quality uses more data
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Auto-play</p>
                  <p className="text-xs text-muted-foreground">
                    Automatically play similar music when your playlist ends
                  </p>
                </div>
                <Switch 
                  checked={appSettings.auto_play}
                  onCheckedChange={(checked) => handleSettingChange('auto_play', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Volume Normalization</p>
                  <p className="text-xs text-muted-foreground">
                    Automatically adjust volume levels between tracks
                  </p>
                </div>
                <Switch 
                  checked={appSettings.volume_normalization}
                  onCheckedChange={(checked) => handleSettingChange('volume_normalization', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Crossfade</p>
                  <p className="text-xs text-muted-foreground">
                    Smoothly transition between tracks
                  </p>
                </div>
                <Switch 
                  checked={appSettings.crossfade_enabled}
                  onCheckedChange={(checked) => handleSettingChange('crossfade_enabled', checked)}
                />
              </div>

              {appSettings.crossfade_enabled && (
                <div className="ml-6">
                  <p className="text-sm font-medium mb-2">Crossfade Duration</p>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[appSettings.crossfade_duration]}
                      onValueChange={([value]) => handleSettingChange('crossfade_duration', value)}
                      max={12}
                      min={1}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground w-8">
                      {appSettings.crossfade_duration}s
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Storage & Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Storage & Data
              </CardTitle>
              <CardDescription>
                Manage offline content and data usage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Download Quality</p>
                <Select 
                  value={appSettings.download_quality} 
                  onValueChange={(value: 'low' | 'medium' | 'high') => 
                    handleSettingChange('download_quality', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low (96 kbps)</SelectItem>
                    <SelectItem value="medium">Medium (160 kbps)</SelectItem>
                    <SelectItem value="high">High (320 kbps)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Quality for downloaded music
                </p>
              </div>

                            <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Data Saver</p>
                  <p className="text-xs text-muted-foreground">
                    Use lower quality when on mobile data
                  </p>
                </div>
                <Switch 
                  checked={appSettings.data_saver}
                  onCheckedChange={(checked) => handleSettingChange('data_saver', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Offline Mode</p>
                  <p className="text-xs text-muted-foreground">
                    Only play downloaded music when offline
                  </p>
                </div>
                <Switch 
                  checked={appSettings.offline_mode}
                  onCheckedChange={(checked) => handleSettingChange('offline_mode', checked)}
                />
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Cache Size</p>
                <div className="flex items-center gap-3">
                  <Slider
                    value={[appSettings.cache_size_mb]}
                    onValueChange={([value]) => handleSettingChange('cache_size_mb', value)}
                    max={2000}
                    min={100}
                    step={100}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground w-16">
                    {appSettings.cache_size_mb} MB
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Storage space reserved for temporary files
                </p>
              </div>

              <Button variant="outline" onClick={clearCache} className="w-full">
                <HardDrive className="h-4 w-4 mr-2" />
                Clear Cache
              </Button>
            </CardContent>
          </Card>

          {/* Privacy & Analytics */}
          <Card>
            <CardHeader>
              <CardTitle>Privacy & Analytics</CardTitle>
              <CardDescription>
                Control data collection and privacy settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Usage Analytics</p>
                  <p className="text-xs text-muted-foreground">
                    Help improve Auralia AI by sharing anonymous usage data
                  </p>
                </div>
                <Switch 
                  checked={appSettings.analytics_enabled}
                  onCheckedChange={(checked) => handleSettingChange('analytics_enabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Crash Reporting</p>
                  <p className="text-xs text-muted-foreground">
                    Automatically send crash reports to help fix bugs
                  </p>
                </div>
                <Switch 
                  checked={appSettings.crash_reporting}
                  onCheckedChange={(checked) => handleSettingChange('crash_reporting', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleResetSettings} disabled={loading}>
                <RotateCcw className="h-4 w-4 mr-2" />
                {loading ? 'Resetting...' : 'Reset to Default'}
              </Button>
              <Button variant="outline" onClick={exportSettings}>
                <Download className="h-4 w-4 mr-2" />
                Export Settings
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              {saved && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <Check className="h-4 w-4" />
                  Saved!
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                Settings are saved automatically
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
