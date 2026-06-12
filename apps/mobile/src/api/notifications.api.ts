import { apiClient } from './client';
import type { Notification } from '../types/notification';

export async function getNotifications(limit = 50): Promise<Notification[]> {
  const { data } = await apiClient.get<Notification[]>('/notifications', {
    params: { limit },
  });
  return data;
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { data } = await apiClient.get<{ count: number }>('/notifications/unread-count');
  return data.count;
}

export async function markNotificationRead(notificationId: string): Promise<Notification> {
  const { data } = await apiClient.patch<Notification>(
    `/notifications/${notificationId}/read`
  );
  return data;
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.patch('/notifications/read-all');
}

export interface DeviceTokenRegisterPayload {
  expo_push_token: string;
  platform: 'android' | 'ios' | 'unknown';
  device_name?: string;
  device_id?: string;
  app_version?: string;
  build_version?: string;
  environment: 'development' | 'preview' | 'production';
}

export interface DeviceTokenRead {
  id: string;
  platform: string;
  device_name: string | null;
  environment: string;
  is_active: boolean;
  last_seen_at: string;
  created_at: string;
}

export async function registerDeviceToken(
  payload: DeviceTokenRegisterPayload
): Promise<DeviceTokenRead> {
  const { data } = await apiClient.post<DeviceTokenRead>(
    '/notifications/device-tokens',
    payload
  );
  return data;
}

export async function unregisterCurrentDeviceToken(
  expoPushToken?: string | null
): Promise<void> {
  await apiClient.request({
    method: 'DELETE',
    url: '/notifications/device-tokens/current',
    data: expoPushToken ? { expo_push_token: expoPushToken } : {},
  });
}
