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
  language: 'en',
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
  // App Settings
  async getAppSettings(userId: string): Promise<AppSettings> {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('Error fetching app settings:', error.message);
        return DEFAULT_APP_SETTINGS;
      }

      if (!data) {
        // Try to create default settings
        try {
          return await this.createDefaultAppSettings(userId);
        } catch (createError) {
          console.warn('Could not create default app settings:', createError);
          return DEFAULT_APP_SETTINGS;
        }
      }

      // Map database fields to our interface
      return {
        theme: data.theme || DEFAULT_APP_SETTINGS.theme,
        language: data.language || DEFAULT_APP_SETTINGS.language,
        audio_quality: data.audio_quality || DEFAULT_APP_SETTINGS.audio_quality,
        auto_play: data.auto_play ?? DEFAULT_APP_SETTINGS.auto_play,
        crossfade_enabled: data.crossfade_enabled ?? DEFAULT_APP_SETTINGS.crossfade_enabled,
        crossfade_duration: data.crossfade_duration || DEFAULT_APP_SETTINGS.crossfade_duration,
        volume_normalization: data.volume_normalization ?? DEFAULT_APP_SETTINGS.volume_normalization,
        download_quality: data.download_quality || DEFAULT_APP_SETTINGS.download_quality,
        offline_mode: data.offline_mode ?? DEFAULT_APP_SETTINGS.offline_mode,
        data_saver: data.data_saver ?? DEFAULT_APP_SETTINGS.data_saver,
        cache_size_mb: data.cache_size_mb || DEFAULT_APP_SETTINGS.cache_size_mb,
        analytics_enabled: data.analytics_enabled ?? DEFAULT_APP_SETTINGS.analytics_enabled,
        crash_reporting: data.crash_reporting ?? DEFAULT_APP_SETTINGS.crash_reporting,
        profile_visibility: data.profile_visibility ?? DEFAULT_APP_SETTINGS.profile_visibility,
        email_notifications: data.email_notifications ?? DEFAULT_APP_SETTINGS.email_notifications,
        marketing_notifications: data.marketing_notifications ?? DEFAULT_APP_SETTINGS.marketing_notifications,
      };
    } catch (error) {
      console.error('Error loading app settings:', error);
      return DEFAULT_APP_SETTINGS;
    }
  }

  async saveAppSettings(userId: string, settings: AppSettings): Promise<void> {
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          user_id: userId,
          ...settings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      // Apply theme immediately
      this.applyTheme(settings.theme);
      
      // Store in localStorage as backup
      localStorage.setItem('auralia_app_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving app settings:', error);
      throw error;
    }
  }

  private async createDefaultAppSettings(userId: string): Promise<AppSettings> {
    try {
      const { error } = await supabase
        .from('app_settings')
        .insert({
          user_id: userId,
          ...DEFAULT_APP_SETTINGS
        });

      if (error) throw error;
      return DEFAULT_APP_SETTINGS;
    } catch (error) {
      console.error('Error creating default app settings:', error);
      return DEFAULT_APP_SETTINGS;
    }
  }

  // Notification Settings
  async getNotificationSettings(userId: string): Promise<NotificationSettings> {
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('Error fetching notification settings:', error.message);
        return DEFAULT_NOTIFICATION_SETTINGS;
      }

      if (!data) {
        try {
          return await this.createDefaultNotificationSettings(userId);
        } catch (createError) {
          console.warn('Could not create default notification settings:', createError);
          return DEFAULT_NOTIFICATION_SETTINGS;
        }
      }

      return {
        email_notifications: data.email_notifications ?? DEFAULT_NOTIFICATION_SETTINGS.email_notifications,
        push_notifications: data.push_notifications ?? DEFAULT_NOTIFICATION_SETTINGS.push_notifications,
        marketing_emails: data.marketing_emails ?? DEFAULT_NOTIFICATION_SETTINGS.marketing_emails,
        new_music_alerts: data.new_music_alerts ?? DEFAULT_NOTIFICATION_SETTINGS.new_music_alerts,
        playlist_updates: data.playlist_updates ?? DEFAULT_NOTIFICATION_SETTINGS.playlist_updates,
        social_interactions: data.social_interactions ?? DEFAULT_NOTIFICATION_SETTINGS.social_interactions,
        system_updates: data.system_updates ?? DEFAULT_NOTIFICATION_SETTINGS.system_updates,
        sound_enabled: data.sound_enabled ?? DEFAULT_NOTIFICATION_SETTINGS.sound_enabled,
        notification_frequency: data.notification_frequency || DEFAULT_NOTIFICATION_SETTINGS.notification_frequency,
        quiet_hours_enabled: data.quiet_hours_enabled ?? DEFAULT_NOTIFICATION_SETTINGS.quiet_hours_enabled,
        quiet_hours_start: data.quiet_hours_start || DEFAULT_NOTIFICATION_SETTINGS.quiet_hours_start,
        quiet_hours_end: data.quiet_hours_end || DEFAULT_NOTIFICATION_SETTINGS.quiet_hours_end,
      };
    } catch (error) {
      console.error('Error loading notification settings:', error);
      return DEFAULT_NOTIFICATION_SETTINGS;
    }
  }

  async saveNotificationSettings(userId: string, settings: NotificationSettings): Promise<void> {
    try {
      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: userId,
          ...settings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving notification settings:', error);
      throw error;
    }
  }

  private async createDefaultNotificationSettings(userId: string): Promise<NotificationSettings> {
    try {
      const { error } = await supabase
        .from('notification_settings')
        .insert({
          user_id: userId,
          ...DEFAULT_NOTIFICATION_SETTINGS
        });

      if (error) throw error;
      return DEFAULT_NOTIFICATION_SETTINGS;
    } catch (error) {
      console.error('Error creating default notification settings:', error);
      return DEFAULT_NOTIFICATION_SETTINGS;
    }
  }

  // Utility methods
  applyTheme(theme: 'light' | 'dark' | 'system') {
    const root = document.documentElement;
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.className = systemTheme;
    } else {
      root.className = theme;
    }
  }

  // Load settings from localStorage as fallback
  loadLocalSettings(): AppSettings {
    try {
      const savedSettings = localStorage.getItem('auralia_app_settings');
      if (savedSettings) {
        return { ...DEFAULT_APP_SETTINGS, ...JSON.parse(savedSettings) };
      }
    } catch (error) {
      console.error('Error parsing local settings:', error);
    }
    return DEFAULT_APP_SETTINGS;
  }

  // Clear cache
  async clearCache(): Promise<void> {
    try {
      // Clear localStorage
      const keysToRemove = [
        'auralia_app_settings',
        'auralia_audio_cache',
        'auralia_metadata_cache'
      ];
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });

      // In a real app, you would also clear IndexedDB cache here
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }

  // Export settings
  async exportSettings(userId: string): Promise<{ appSettings: AppSettings; notificationSettings: NotificationSettings }> {
    const [appSettings, notificationSettings] = await Promise.all([
      this.getAppSettings(userId),
      this.getNotificationSettings(userId)
    ]);

    return {
      appSettings,
      notificationSettings
    };
  }

  // Import settings
  async importSettings(
    userId: string, 
    data: { appSettings?: AppSettings; notificationSettings?: NotificationSettings }
  ): Promise<void> {
    try {
      const promises = [];

      if (data.appSettings) {
        promises.push(this.saveAppSettings(userId, data.appSettings));
      }

      if (data.notificationSettings) {
        promises.push(this.saveNotificationSettings(userId, data.notificationSettings));
      }

      await Promise.all(promises);
    } catch (error) {
      console.error('Error importing settings:', error);
      throw error;
    }
  }
}

export const settingsService = new SettingsService();
