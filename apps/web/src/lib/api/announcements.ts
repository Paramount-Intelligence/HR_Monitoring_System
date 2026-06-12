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

export const announcementsApi = {
  getAnnouncements: async () => {
    const response = await apiClient.get<Announcement[]>('/announcements');
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
  }
};
