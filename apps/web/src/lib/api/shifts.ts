import apiClient from './client';
import { Shift } from '@/types';

export const shiftsApi = {
  getShifts: async (only_active: boolean = false) => {
    const response = await apiClient.get<Shift[]>('/shifts', { params: { only_active } });
    return response.data;
  },
  createShift: async (data: Omit<Shift, 'id'>) => {
    const response = await apiClient.post<Shift>('/shifts', data);
    return response.data;
  },
  updateShift: async (id: string, data: Partial<Shift>) => {
    const response = await apiClient.patch<Shift>(`/shifts/${id}`, data);
    return response.data;
  },
  deactivateShift: async (id: string) => {
    const response = await apiClient.delete(`/shifts/${id}`);
    return response.data;
  },
  getShift: async (id: string) => {
    const response = await apiClient.get<Shift>(`/shifts/${id}`);
    return response.data;
  },
};
