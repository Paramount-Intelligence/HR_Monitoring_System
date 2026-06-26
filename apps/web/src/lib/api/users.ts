import axios from 'axios';
import apiClient, { API_URL } from './client';
import { User } from '@/types';

async function uploadMultipart(endpoint: string, file: File): Promise<User> {
  const formData = new FormData();
  formData.append('file', file);

  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  const response = await axios.patch<User>(`${API_URL}${endpoint}`, formData, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    withCredentials: true,
  });
  return response.data;
}

export const usersApi = {
  getUsers: async (params?: Record<string, any>) => {
    const response = await apiClient.get<User[]>('/users', { params });
    return response.data;
  },

  getActiveDirectory: async () => {
    const response = await apiClient.get<Partial<User>[]>('/users/active-directory');
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

  updateMyPresence: async (presence_status: 'active' | 'away') => {
    const response = await apiClient.patch<{
      presence_status: 'active' | 'away';
      presence_updated_at: string | null;
      last_seen_at: string | null;
    }>('/users/me/presence', { presence_status });
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

  uploadMyProfilePicture: async (file: File) => {
    return uploadMultipart('/users/me/profile-picture', file);
  },

  deleteMyProfilePicture: async () => {
    const response = await apiClient.delete<User>('/users/me/profile-picture');
    return response.data;
  },

  uploadUserProfilePicture: async (userId: string, file: File) => {
    return uploadMultipart(`/users/${userId}/profile-picture`, file);
  },

  deleteUserProfilePicture: async (userId: string) => {
    const response = await apiClient.delete<User>(`/users/${userId}/profile-picture`);
    return response.data;
  },

  updateUserRole: async (userId: string, role: string) => {
    const response = await apiClient.patch<User>(`/users/${userId}/role`, { role });
    return response.data;
  },

  updateUserDepartment: async (
    userId: string,
    payload: { department_id?: string | null; designation?: string; clear_department?: boolean }
  ) => {
    const response = await apiClient.patch<User>(`/users/${userId}/department`, payload);
    return response.data;
  },

  updateUserDepartmentDetails: async (
    userId: string,
    payload: {
      department_id?: string | null;
      shift_id?: string | null;
      manager_id?: string | null;
      designation?: string | null;
    }
  ) => {
    const response = await apiClient.patch<User>(`/users/${userId}/department-details`, payload);
    return response.data;
  },

  updateUserStatus: async (userId: string, status: string) => {
    const response = await apiClient.patch<User>(`/users/${userId}/status`, { status });
    return response.data;
  },

  updateUserReporting: async (
    userId: string,
    payload: {
      manager_id?: string | null;
      shift_id?: string | null;
      designation?: string;
      update_manager?: boolean;
      update_shift?: boolean;
    }
  ) => {
    const response = await apiClient.patch<User>(`/users/${userId}/reporting`, payload);
    return response.data;
  },

  updateUserAdminProfile: async (
    userId: string,
    payload: { full_name?: string; email?: string; phone?: string | null; designation?: string }
  ) => {
    const response = await apiClient.patch<User>(`/users/${userId}/admin-profile`, payload);
    return response.data;
  },

  getUserPermissions: async (userId: string) => {
    const response = await apiClient.get(`/users/${userId}/permissions`);
    return response.data;
  },

  updateUserPermissions: async (
    userId: string,
    payload: { extra_grants: string[]; extra_denies: string[] }
  ) => {
    const response = await apiClient.patch(`/users/${userId}/permissions`, payload);
    return response.data;
  },

  sendPasswordReset: async (userId: string) => {
    const response = await apiClient.post<{ message: string; email_sent: boolean; email_error?: string }>(
      `/users/${userId}/send-password-reset`
    );
    return response.data;
  },

  resendInvitation: async (userId: string) => {
    const response = await apiClient.post<{ message: string; email_sent: boolean; email_error?: string }>(
      `/users/${userId}/resend-invitation`
    );
    return response.data;
  },

  forcePasswordReset: async (userId: string) => {
    const response = await apiClient.post<{ message: string; email_sent: boolean; email_error?: string }>(
      `/users/${userId}/force-password-reset`
    );
    return response.data;
  },

  getUserAdminSummary: async (userId: string) => {
    const response = await apiClient.get(`/users/${userId}/admin-summary`);
    return response.data;
  },

  getUserAuditLogs: async (userId: string, limit = 100) => {
    const response = await apiClient.get(`/users/${userId}/audit-logs`, { params: { limit } });
    return response.data;
  },
};
