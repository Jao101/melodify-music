// Temporary types for new settings tables until remote migration is applied
export interface AppSettingsRow {
  id: string
  user_id: string
  theme: 'light' | 'dark' | 'system'
  language: string
  audio_quality: 'low' | 'medium' | 'high' | 'lossless'
  auto_play: boolean
  crossfade_enabled: boolean
  crossfade_duration: number
  volume_normalization: boolean
  download_quality: 'low' | 'medium' | 'high'
  offline_mode: boolean
  data_saver: boolean
  cache_size_mb: number
  analytics_enabled: boolean
  crash_reporting: boolean
  profile_visibility: boolean
  email_notifications: boolean
  marketing_notifications: boolean
  created_at: string
  updated_at: string
}

export interface NotificationSettingsRow {
  id: string
  user_id: string
  email_notifications: boolean
  push_notifications: boolean
  marketing_emails: boolean
  new_music_alerts: boolean
  playlist_updates: boolean
  social_interactions: boolean
  system_updates: boolean
  sound_enabled: boolean
  notification_frequency: 'realtime' | 'daily' | 'weekly'
  quiet_hours_enabled: boolean
  quiet_hours_start: string
  quiet_hours_end: string
  created_at: string
  updated_at: string
}

// Temporary database type extension
export interface DatabaseWithSettings {
  public: {
    Tables: {
      app_settings: {
        Row: AppSettingsRow
        Insert: Omit<AppSettingsRow, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<AppSettingsRow, 'id' | 'user_id' | 'created_at'>>
      }
      notification_settings: {
        Row: NotificationSettingsRow
        Insert: Omit<NotificationSettingsRow, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<NotificationSettingsRow, 'id' | 'user_id' | 'created_at'>>
      }
    }
  }
}
