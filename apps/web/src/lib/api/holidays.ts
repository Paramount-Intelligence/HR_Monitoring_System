import apiClient from './client';

export interface Holiday {
  id: string;
  name: string;
  holiday_date: string;
}

export const holidaysApi = {
  getHolidays: async () => {
    const response = await apiClient.get<Holiday[]>('/holidays');
    return response.data;
  },
  createHoliday: async (data: { name: string; holiday_date: string }) => {
    const response = await apiClient.post<Holiday>('/holidays', data);
    return response.data;
  }
};
