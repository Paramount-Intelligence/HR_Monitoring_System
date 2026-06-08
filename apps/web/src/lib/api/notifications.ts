import apiClient from './client';

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
}

export const notificationsApi = {
  getNotifications: async (limit: number = 50): Promise<Notification[]> => {
    const response = await apiClient.get<Notification[]>('/notifications/', {
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
};
