import apiClient from './client';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  is_active?: boolean;
  created_at: string;
}

export const announcementsApi = {
  getAnnouncements: async () => {
    const response = await apiClient.get<Announcement[]>('/announcements');
    return response.data;
  },
  createAnnouncement: async (data: { title: string; content: string; priority?: string }) => {
    const response = await apiClient.post<Announcement>('/announcements', { title: data.title, content: data.content, is_active: true });
    return response.data;
  }
};
