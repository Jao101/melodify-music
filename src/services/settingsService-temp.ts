import { supabase } from "@/integrations/supabase/client";

export interface AppSettings {
  // Appearance
  theme: 'light' | 'dark' | 'system';
  language: string;
  
  // Audio
  audio_quality: 'low' | 'medium' | 'high' | 'lossless';
  auto_play: boolean;
  crossfade_enabled: boolean;
  crossfade_duration: number;
  volume_normalization: boolean;
  
  // Storage & Data
  download_quality: 'low' | 'medium' | 'high';
  offline_mode: boolean;
  data_saver: boolean;
  cache_size_mb: number;
  
  // Privacy
  analytics_enabled: boolean;
  crash_reporting: boolean;
  profile_visibility: boolean;
  email_notifications: boolean;
  marketing_notifications: boolean;
}

export interface NotificationSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  marketing_emails: boolean;
  new_music_alerts: boolean;
  playlist_updates: boolean;
  social_interactions: boolean;
  system_updates: boolean;
  sound_enabled: boolean;
  notification_frequency: 'realtime' | 'daily' | 'weekly';
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

// Default settings
export const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: 'system',
  language: 'de',
  audio_quality: 'high',
  auto_play: true,
  crossfade_enabled: false,
  crossfade_duration: 5,
  volume_normalization: true,
  download_quality: 'high',
  offline_mode: false,
  data_saver: false,
  cache_size_mb: 500,
  analytics_enabled: true,
  crash_reporting: true,
  profile_visibility: true,
  email_notifications: true,
  marketing_notifications: false,
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  email_notifications: true,
  push_notifications: true,
  marketing_emails: false,
  new_music_alerts: true,
  playlist_updates: true,
  social_interactions: true,
  system_updates: true,
  sound_enabled: true,
  notification_frequency: 'realtime',
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00',
  quiet_hours_end: '08:00',
};

class SettingsService {
  private readonly STORAGE_PREFIX = 'melodify_';

  // Helper to check if table exists by trying a simple query
  private async tableExists(tableName: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(tableName as any)
        .select('id')
        .limit(1);
      
      return !error || error.code === 'PGRST116'; // PGRST116 = no rows, table exists
    } catch {
      return false;
    }
  }

  // App Settings
  async getAppSettings(userId: string): Promise<AppSettings> {
    try {
      // Check if remote table exists
      const hasRemoteTable = await this.tableExists('app_settings');
      
      if (hasRemoteTable) {
        const { data, error } = await supabase
          .from('app_settings' as any)
          .select('*')
          .eq('user_id', userId)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          return data as AppSettings;
        }
      }

      // Fallback to localStorage if remote table doesn't exist or no data
      const stored = localStorage.getItem(`${this.STORAGE_PREFIX}app_settings_${userId}`);
      if (stored) {
        return { ...DEFAULT_APP_SETTINGS, ...JSON.parse(stored) };
      }

      return DEFAULT_APP_SETTINGS;
    } catch (error) {
      console.warn('Using localStorage fallback for app settings:', error);
      const stored = localStorage.getItem(`${this.STORAGE_PREFIX}app_settings_${userId}`);
      if (stored) {
        return { ...DEFAULT_APP_SETTINGS, ...JSON.parse(stored) };
      }
      return DEFAULT_APP_SETTINGS;
    }
  }

  async saveAppSettings(userId: string, settings: Partial<AppSettings>): Promise<void> {
    try {
      // Try to save to remote database first
      const hasRemoteTable = await this.tableExists('app_settings');
      
      if (hasRemoteTable) {
        const { error } = await supabase
          .from('app_settings' as any)
          .upsert({
            user_id: userId,
            ...settings,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id'
          });

        if (!error) {
          console.log('Settings saved to remote database');
          return;
        }
      }

      // Fallback to localStorage
      const current = await this.getAppSettings(userId);
      const updated = { ...current, ...settings };
      localStorage.setItem(`${this.STORAGE_PREFIX}app_settings_${userId}`, JSON.stringify(updated));
      console.log('Settings saved to localStorage (remote not available)');
      
    } catch (error) {
      console.warn('Error saving app settings, using localStorage:', error);
      const current = await this.getAppSettings(userId);
      const updated = { ...current, ...settings };
      localStorage.setItem(`${this.STORAGE_PREFIX}app_settings_${userId}`, JSON.stringify(updated));
    }
  }

  // Notification Settings
  async getNotificationSettings(userId: string): Promise<NotificationSettings> {
    try {
      const hasRemoteTable = await this.tableExists('notification_settings');
      
      if (hasRemoteTable) {
        const { data, error } = await supabase
          .from('notification_settings' as any)
          .select('*')
          .eq('user_id', userId)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          return data as NotificationSettings;
        }
      }

      // Fallback to localStorage
      const stored = localStorage.getItem(`${this.STORAGE_PREFIX}notification_settings_${userId}`);
      if (stored) {
        return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(stored) };
      }

      return DEFAULT_NOTIFICATION_SETTINGS;
    } catch (error) {
      console.warn('Using localStorage fallback for notification settings:', error);
      const stored = localStorage.getItem(`${this.STORAGE_PREFIX}notification_settings_${userId}`);
      if (stored) {
        return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(stored) };
      }
      return DEFAULT_NOTIFICATION_SETTINGS;
    }
  }

  async saveNotificationSettings(userId: string, settings: Partial<NotificationSettings>): Promise<void> {
    try {
      const hasRemoteTable = await this.tableExists('notification_settings');
      
      if (hasRemoteTable) {
        const { error } = await supabase
          .from('notification_settings' as any)
          .upsert({
            user_id: userId,
            ...settings,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id'
          });

        if (!error) {
          console.log('Notification settings saved to remote database');
          return;
        }
      }

      // Fallback to localStorage
      const current = await this.getNotificationSettings(userId);
      const updated = { ...current, ...settings };
      localStorage.setItem(`${this.STORAGE_PREFIX}notification_settings_${userId}`, JSON.stringify(updated));
      console.log('Notification settings saved to localStorage (remote not available)');
      
    } catch (error) {
      console.warn('Error saving notification settings, using localStorage:', error);
      const current = await this.getNotificationSettings(userId);
      const updated = { ...current, ...settings };
      localStorage.setItem(`${this.STORAGE_PREFIX}notification_settings_${userId}`, JSON.stringify(updated));
    }
  }

  // Theme handling
  applyTheme(theme: AppSettings['theme']) {
    const root = document.documentElement;
    
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  }

  // Get all settings
  async getAllSettings(userId: string): Promise<{
    appSettings: AppSettings;
    notificationSettings: NotificationSettings;
  }> {
    const [appSettings, notificationSettings] = await Promise.all([
      this.getAppSettings(userId),
      this.getNotificationSettings(userId),
    ]);

    return { appSettings, notificationSettings };
  }

  // Clear all settings (for logout)
  clearAllSettings(userId: string) {
    localStorage.removeItem(`${this.STORAGE_PREFIX}app_settings_${userId}`);
    localStorage.removeItem(`${this.STORAGE_PREFIX}notification_settings_${userId}`);
  }
}

export const settingsService = new SettingsService();
