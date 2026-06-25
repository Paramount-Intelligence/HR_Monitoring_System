import apiClient from './client';

export interface OrganizationMember {
  id: string;
  full_name: string;
  role: string;
  designation?: string | null;
  department_name?: string | null;
  shift_name?: string | null;
  manager_name?: string | null;
  status: string;
}

export const organizationMembersApi = {
  getDepartmentEmployees: async (departmentId: string) => {
    const response = await apiClient.get<OrganizationMember[]>(
      `/departments/${departmentId}/employees`
    );
    return response.data;
  },
  getShiftEmployees: async (shiftId: string) => {
    const response = await apiClient.get<OrganizationMember[]>(
      `/shifts/${shiftId}/employees`
    );
    return response.data;
  },
};
