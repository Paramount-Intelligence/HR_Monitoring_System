import apiClient from './client';

export interface Department {
  id: string;
  name: string;
  manager_id?: string;
  manager_name?: string;
}

export const organizationApi = {
  getDepartments: async () => {
    const response = await apiClient.get<Department[]>('/departments');
    return response.data;
  },
  getOrgStats: async () => {
    const response = await apiClient.get<any>('/dashboard/admin');
    return response.data;
  }
};
