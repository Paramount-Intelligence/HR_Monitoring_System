import apiClient from './client';

export interface Department {
  id: string;
  name: string;
  description?: string;
  admin_id?: string;
  admin_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const departmentsApi = {
  getDepartments: async () => {
    const response = await apiClient.get<Department[]>('/departments');
    return response.data;
  },
  getActiveDepartments: async () => {
    const response = await apiClient.get<Department[]>('/departments/active');
    return response.data;
  },
  createDepartment: async (data: { name: string; description?: string; admin_id?: string; is_active?: boolean }) => {
    const response = await apiClient.post<Department>('/departments', data);
    return response.data;
  },
  updateDepartment: async (id: string, data: Partial<Department>) => {
    const response = await apiClient.patch<Department>(`/departments/${id}`, data);
    return response.data;
  },
  deactivateDepartment: async (id: string) => {
    const response = await apiClient.delete(`/departments/${id}`);
    return response.data;
  }
};
