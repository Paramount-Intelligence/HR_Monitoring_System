import apiClient from './client';

export interface Task {
  id: string;
  project_id: string;
  project_title?: string;
  assigned_to: string;
  assigned_to_name?: string;
  created_by: string;
  title: string;
  description: string;
  complexity_level: number;
  expected_duration_minutes: number;
  actual_duration_minutes: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'created' | 'approved' | 'in_progress' | 'blocked' | 'completed' | 'reviewed' | 'reopened';
  blocked_reason: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const tasksApi = {
  getTasks: async (params?: Record<string, any>) => {
    const response = await apiClient.get<Task[]>('/tasks', { params });
    return response.data;
  },

  getTask: async (id: string) => {
    const response = await apiClient.get<Task>(`/tasks/${id}`);
    return response.data;
  },

  createTask: async (data: { project_id: string; assigned_to: string; title: string; description: string; priority: string; due_date?: string | null }) => {
    const response = await apiClient.post<Task>('/tasks', data);
    return response.data;
  },

  updateTask: async (id: string, data: Partial<Task>) => {
    const response = await apiClient.patch<Task>(`/tasks/${id}`, data);
    return response.data;
  },

  setComplexity: async (id: string, complexity: number, expectedDuration: number) => {
    const response = await apiClient.post<Task>(`/tasks/${id}/complexity`, {
      complexity_level: complexity,
      expected_duration_minutes: expectedDuration
    });
    return response.data;
  },

  getAdminTaskOverview: async (params?: Record<string, any>) => {
    const response = await apiClient.get<{
      summary: {
        total_tasks: number;
        active_tasks: number;
        in_progress: number;
        completed: number;
        overdue: number;
        currently_working: number;
      };
      total_count: number;
      tasks: (Task & {
        timer_state: 'not_started' | 'running' | 'paused';
        timer_duration_seconds: number;
        timer_pause_reason: string | null;
      })[];
      active_work: {
        id: string;
        task_id: string;
        task_title: string;
        project_title: string;
        employee_id: string;
        employee_name: string;
        employee_role: string;
        timer_state: 'running' | 'paused';
        started_at: string | null;
        current_duration_seconds: number;
        pause_reason: string | null;
      }[];
    }>('/tasks/admin/overview', { params });
    return response.data;
  },
};
