import apiClient from './client';

export type BannerMode = 'always' | 'app_open' | 'never';
export type TaskbarBadgeMode = 'always' | 'app_open' | 'never';

export interface NotificationPreferences {
  banner_mode: BannerMode;
  taskbar_badge_mode: TaskbarBadgeMode;
  show_previews: boolean;
  outgoing_sound_enabled: boolean;
  incoming_sound_enabled: boolean;
  message_notifications_enabled: boolean;
  group_notifications_enabled: boolean;
  call_notifications_enabled: boolean;
  task_notifications_enabled: boolean;
  approval_notifications_enabled: boolean;
  attendance_notifications_enabled: boolean;
  leave_notifications_enabled: boolean;
  announcement_notifications_enabled: boolean;
  mention_notifications_enabled: boolean;
  desktop_notifications_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

export type NotificationPreferencesUpdate = Partial<NotificationPreferences>;

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
  route?: string | null;
  deep_link?: string | null;
  category?: string;
  entity_type?: string | null;
  entity_id?: string | null;
}

export interface WebPushPublicKey {
  public_key: string | null;
  configured: boolean;
}

export interface WebPushSubscriptionPayload {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string | null;
}

export const notificationsApi = {
  getNotifications: async (limit: number = 50): Promise<Notification[]> => {
    const response = await apiClient.get<Notification[]>('/notifications', {
      params: { limit },
    });
    return response.data;
  },

  getUnreadCount: async (): Promise<{ count: number }> => {
    const response = await apiClient.get<{ count: number }>('/notifications/unread-count');
    return response.data;
  },

  markRead: async (notificationId: string): Promise<Notification> => {
    const response = await apiClient.patch<Notification>(`/notifications/${notificationId}/read`);
    return response.data;
  },

  markAllRead: async (): Promise<{ message: string }> => {
    const response = await apiClient.patch<{ message: string }>('/notifications/read-all');
    return response.data;
  },

  getPreferences: async (): Promise<NotificationPreferences> => {
    const response = await apiClient.get<NotificationPreferences>('/notifications/preferences');
    return response.data;
  },

  updatePreferences: async (
    payload: NotificationPreferencesUpdate
  ): Promise<NotificationPreferences> => {
    const response = await apiClient.patch<NotificationPreferences>(
      '/notifications/preferences',
      payload
    );
    return response.data;
  },

  getPushPublicKey: async (): Promise<WebPushPublicKey> => {
    const response = await apiClient.get<WebPushPublicKey>('/notifications/push-public-key');
    return response.data;
  },

  registerPushSubscription: async (
    payload: WebPushSubscriptionPayload
  ): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(
      '/notifications/push-subscriptions',
      payload
    );
    return response.data;
  },

  unregisterPushSubscription: async (
    payload: WebPushSubscriptionPayload
  ): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(
      '/notifications/push-subscriptions',
      { data: payload }
    );
    return response.data;
  },

  sendTestWebPush: async (): Promise<{
    configured: boolean;
    message?: string | null;
    subscriptions: number;
    attempted: number;
    sent: number;
    failed: number;
  }> => {
    const response = await apiClient.post<{
      configured: boolean;
      message?: string | null;
      subscriptions: number;
      attempted: number;
      sent: number;
      failed: number;
    }>('/notifications/push/test');
    return response.data;
  },
};
