import apiClient from './client';

export interface Duty {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: 'pending' | 'completed';
  created_at: string;
  updated_at: string;
}

export const dutiesApi = {
  getDailyDuties: async () => {
    const response = await apiClient.get<Duty[]>('/duties');
    return response.data;
  },

  createDuty: async (data: { title: string; description?: string }) => {
    const response = await apiClient.post<Duty>('/duties', data);
    return response.data;
  },

  updateDutyStatus: async (id: string, status: 'pending' | 'completed') => {
    const response = await apiClient.patch<Duty>(`/duties/${id}`, { status });
    return response.data;
  },

  deleteDuty: async (id: string) => {
    const response = await apiClient.delete<{ success: boolean }>(`/duties/${id}`);
    return response.data;
  }
};
