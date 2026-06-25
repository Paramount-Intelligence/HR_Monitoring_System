import apiClient from './client';

export interface Holiday {
  id: string;
  name: string;
  description?: string;
  holiday_date: string;
  is_active: boolean;
}

export const holidaysApi = {
  getHolidays: async () => {
    const response = await apiClient.get<Holiday[]>('/holidays');
    return response.data;
  },
  getActiveHolidays: async () => {
    const response = await apiClient.get<Holiday[]>('/holidays/active');
    return response.data;
  },
  getUpcomingHolidays: async (params?: { limit?: number; fromDate?: string }) => {
    const response = await apiClient.get<Holiday[]>('/holidays/upcoming', {
      params: {
        limit: params?.limit ?? 5,
        from_date: params?.fromDate,
      },
    });
    return response.data;
  },
  createHoliday: async (data: { name: string; description?: string; holiday_date: string; is_active?: boolean }) => {
    const response = await apiClient.post<Holiday>('/holidays', data);
    return response.data;
  },
  updateHoliday: async (id: string, data: Partial<Holiday>) => {
    const response = await apiClient.patch<Holiday>(`/holidays/${id}`, data);
    return response.data;
  },
  deactivateHoliday: async (id: string) => {
    const response = await apiClient.delete(`/holidays/${id}`);
    return response.data;
  }
};
