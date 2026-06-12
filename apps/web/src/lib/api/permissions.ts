import apiClient from './client';

export interface PermissionItem {
  key: string;
  label: string;
  category: string;
  description: string;
}

export interface UserPermissionsDetail {
  user_id: string;
  role: string;
  role_permissions: PermissionItem[];
  extra_permissions: PermissionItem[];
  denied_permissions: PermissionItem[];
  resolved_permissions: string[];
}

export const permissionsApi = {
  listPermissions: async () => {
    const response = await apiClient.get<{ key: string; description: string }[]>('/permissions');
    return response.data;
  },

  getRolePermissions: async (role: string) => {
    const response = await apiClient.get<string[]>(`/permissions/role/${role}`);
    return response.data;
  },

  getUserPermissions: async (userId: string) => {
    const response = await apiClient.get<UserPermissionsDetail>(`/users/${userId}/permissions`);
    return response.data;
  },

  updateUserPermissions: async (
    userId: string,
    payload: { extra_grants: string[]; extra_denies: string[] }
  ) => {
    const response = await apiClient.patch<UserPermissionsDetail>(
      `/users/${userId}/permissions`,
      payload
    );
    return response.data;
  },
};
