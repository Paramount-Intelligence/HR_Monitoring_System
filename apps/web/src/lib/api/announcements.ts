import apiClient from './client';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  audience: string;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ActiveAnnouncementsResponse {
  announcements: Announcement[];
  server_time: string;
}

export const announcementsApi = {
  getAnnouncements: async () => {
    const response = await apiClient.get<Announcement[]>('/announcements');
    return response.data;
  },
  getVisibleAnnouncements: async (params?: { limit?: number; includeExpired?: boolean }) => {
    const response = await apiClient.get<Announcement[]>('/announcements/visible', {
      params: {
        limit: params?.limit ?? 5,
        include_expired: params?.includeExpired ?? false,
      },
    });
    return response.data;
  },
  getActiveAnnouncements: async (params?: { limit?: number }) => {
    const response = await apiClient.get<ActiveAnnouncementsResponse>('/announcements/active', {
      params: { limit: params?.limit ?? 10 },
    });
    return response.data;
  },
  getAllAnnouncements: async () => {
    const response = await apiClient.get<Announcement[]>('/announcements/all');
    return response.data;
  },
  createAnnouncement: async (data: { 
    title: string; 
    content: string; 
    audience: string;
    start_date?: string;
    end_date?: string;
    is_active?: boolean;
  }) => {
    const response = await apiClient.post<Announcement>('/announcements', data);
    return response.data;
  },
  updateAnnouncement: async (
    id: string,
    data: Partial<{
      title: string;
      content: string;
      audience: string;
      start_date: string | null;
      end_date: string | null;
      is_active: boolean;
    }>
  ) => {
    const response = await apiClient.patch<Announcement>(`/announcements/${id}`, data);
    return response.data;
  },
  archiveAnnouncement: async (id: string) => {
    const response = await apiClient.patch<Announcement>(`/announcements/${id}`, {
      is_active: false,
    });
    return response.data;
  },
};
