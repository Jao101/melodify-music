import { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  settingsService, 
  AppSettings, 
  NotificationSettings, 
  DEFAULT_APP_SETTINGS, 
  DEFAULT_NOTIFICATION_SETTINGS 
} from '@/services/settingsService';
import { toast } from 'sonner';

interface SettingsContextType {
  appSettings: AppSettings;
  notificationSettings: NotificationSettings;
  loading: boolean;
  updateAppSettings: (settings: Partial<AppSettings>) => Promise<void>;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  resetAppSettings: () => Promise<void>;
  exportSettings: () => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [loading, setLoading] = useState(false);

  // Load settings when user changes
  useEffect(() => {
    if (user?.id) {
      loadSettings();
    } else {
      // Reset to defaults when no user
      setAppSettings(DEFAULT_APP_SETTINGS);
      setNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS);
    }
  }, [user?.id]);

  // Apply theme when app settings change
  useEffect(() => {
    settingsService.applyTheme(appSettings.theme);
  }, [appSettings.theme]);

  const loadSettings = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const [appData, notificationData] = await Promise.all([
        settingsService.getAppSettings(user.id),
        settingsService.getNotificationSettings(user.id)
      ]);
      
      setAppSettings(appData);
      setNotificationSettings(notificationData);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const updateAppSettings = async (newSettings: Partial<AppSettings>) => {
    if (!user?.id) return;

    try {
      const updatedSettings = { ...appSettings, ...newSettings };
      setAppSettings(updatedSettings);
      await settingsService.saveAppSettings(user.id, updatedSettings);
    } catch (error) {
      console.error('Error updating app settings:', error);
      toast.error('Failed to save settings');
      // Revert on error
      setAppSettings(appSettings);
    }
  };

  const updateNotificationSettings = async (newSettings: Partial<NotificationSettings>) => {
    if (!user?.id) return;

    try {
      const updatedSettings = { ...notificationSettings, ...newSettings };
      setNotificationSettings(updatedSettings);
      await settingsService.saveNotificationSettings(user.id, updatedSettings);
    } catch (error) {
      console.error('Error updating notification settings:', error);
      toast.error('Failed to save notification settings');
      // Revert on error
      setNotificationSettings(notificationSettings);
    }
  };

  const resetAppSettings = async () => {
    if (!user?.id) return;

    try {
      setAppSettings(DEFAULT_APP_SETTINGS);
      await settingsService.saveAppSettings(user.id, DEFAULT_APP_SETTINGS);
      toast.success('Settings reset to default');
    } catch (error) {
      console.error('Error resetting settings:', error);
      toast.error('Failed to reset settings');
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
      link.download = `auralia_settings_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Settings exported successfully');
    } catch (error) {
      console.error('Error exporting settings:', error);
      toast.error('Failed to export settings');
    }
  };

  const refreshSettings = async () => {
    await loadSettings();
  };

  const value: SettingsContextType = {
    appSettings,
    notificationSettings,
    loading,
    updateAppSettings,
    updateNotificationSettings,
    resetAppSettings,
    exportSettings,
    refreshSettings
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

// Individual hooks for specific settings
export function useAppSettings() {
  const { appSettings, updateAppSettings, resetAppSettings } = useSettings();
  return { appSettings, updateAppSettings, resetAppSettings };
}

export function useNotificationSettings() {
  const { notificationSettings, updateNotificationSettings } = useSettings();
  return { notificationSettings, updateNotificationSettings };
}

// Hook for theme management
export function useTheme() {
  const { appSettings, updateAppSettings } = useSettings();
  
  const setTheme = async (theme: 'light' | 'dark' | 'system') => {
    await updateAppSettings({ theme });
  };

  return {
    theme: appSettings.theme,
    setTheme
  };
}
