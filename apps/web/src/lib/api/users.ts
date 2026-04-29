import apiClient from './client';
import { User } from '@/types';

export const usersApi = {
  getUsers: async (params?: Record<string, any>) => {
    const response = await apiClient.get<User[]>('/users', { params });
    return response.data;
  },

  getUser: async (id: string) => {
    const response = await apiClient.get<User>(`/users/${id}`);
    return response.data;
  },

  getMe: async () => {
    const response = await apiClient.get<User>('/users/me');
    return response.data;
  },

  createUser: async (data: Partial<User>) => {
    const response = await apiClient.post<User>('/users', data);
    return response.data;
  },

  updateUser: async (id: string, data: Partial<User>) => {
    const response = await apiClient.patch<User>(`/users/${id}`, data);
    return response.data;
  },

  deactivateUser: async (id: string) => {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data;
  },

  suspendUser: async (id: string, reason?: string) => {
    const response = await apiClient.post(`/users/${id}/suspend`, null, { params: { reason } });
    return response.data;
  },

  activateUser: async (id: string) => {
    const response = await apiClient.post(`/users/${id}/activate`);
    return response.data;
  },

  resendInvitation: async (id: string) => {
    const response = await apiClient.post(`/users/${id}/resend-invite`);
    return response.data;
  },

  getMyPermissions: async () => {
    const response = await apiClient.get<{ permissions: string[] }>('/auth/me/permissions');
    return response.data;
  },
};

