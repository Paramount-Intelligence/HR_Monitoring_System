import apiClient from './client';

export interface DashboardSummary {
  attendance_status: string;
  total_time_today: number; // minutes
  productive_time_today: number; // minutes
  active_timer_task_id: string | null;
  tasks_in_progress: number;
  tasks_due_soon: number;
}

export const dashboardApi = {
  getEmployeeSummary: async () => {
    // This expects the backend GET /dashboard/employee
    // We will build this integration when we verify the exact shape. 
    // Assuming a standard response envelope.
    const response = await apiClient.get<DashboardSummary>('/dashboard/employee');
    return response.data;
  },
  
  getManagerSummary: async () => {
    const response = await apiClient.get('/dashboard/manager');
    return response.data;
  },
  
  getAdminSummary: async () => {
    const response = await apiClient.get('/dashboard/admin');
    return response.data;
  }
};
