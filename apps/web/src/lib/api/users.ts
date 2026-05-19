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

  getAdminUserProfile: async (id: string, params?: { start_date?: string; end_date?: string; limit?: number }) => {
    const response = await apiClient.get(`/users/${id}/admin-profile`, { params });
    return response.data;
  },

  updateMyProfile: async (data: { full_name: string; phone?: string | null }) => {
    const response = await apiClient.patch<User>('/users/me/profile', data);
    return response.data;
  },

  changePassword: async (data: any) => {
    const response = await apiClient.post<{ message: string }>('/users/me/change-password', data);
    return response.data;
  },
};

