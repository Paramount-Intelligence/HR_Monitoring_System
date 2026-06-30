import apiClient from './client';

export interface Project {
  id: string;
  title: string;
  description: string;
  owner_id: string;
  owner_name?: string;
  manager_id: string;
  manager_name?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  approval_status: 'pending' | 'approved' | 'rejected';
  project_status: 'draft' | 'pending_approval' | 'approved' | 'active' | 'on_hold' | 'completed' | 'rejected' | 'archived';
  due_date: string | null;
  approved_at: string | null;
  rejected_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectHealth {
  project_id: string;
  project_name: string;
  summary: {
    total_tasks: number;
    completed_tasks: number;
    in_progress_tasks: number;
    blocked_tasks: number;
    overdue_tasks: number;
    total_logged_hours: number;
    active_members: number;
    completion_rate: number;
    risk_level: string;
  };
  recent_activity: { title: string; description: string; created_at: string | null }[];
  members: { id: string; name: string; department: string | null; active_tasks: number; logged_hours: number }[];
  overdue_tasks: { id: string; title: string; assignee_name: string | null; status: string; due_date: string | null }[];
  blocked_tasks: { id: string; title: string; assignee_name: string | null; status: string; due_date: string | null }[];
}

export const projectsApi = {
  getProjects: async (params?: Record<string, any>) => {
    const response = await apiClient.get<Project[]>('/projects', { params });
    return response.data;
  },

  getTaskEligibleProjects: async () => {
    const response = await apiClient.get<Project[]>('/projects/task-eligible');
    return response.data;
  },

  getProject: async (id: string) => {
    const response = await apiClient.get<Project>(`/projects/${id}`);
    return response.data;
  },

  createProject: async (data: { title: string; description: string; priority: string; due_date?: string; manager_id?: string }) => {
    const response = await apiClient.post<Project>('/projects', data);
    return response.data;
  },

  approveProject: async (id: string, decision: 'approved' | 'rejected', reason?: string) => {
    const response = await apiClient.post<Project>(`/projects/${id}/approve`, {
      decision,
      reason: reason || ''
    });
    return response.data;
  },

  updateProject: async (id: string, data: Partial<{
    title: string;
    description: string;
    priority: string;
    due_date: string | null;
    project_status: string;
    manager_id: string;
  }>) => {
    const response = await apiClient.patch<Project>(`/projects/${id}`, data);
    return response.data;
  },

  archiveProject: async (id: string) => {
    const response = await apiClient.patch<Project>(`/projects/${id}/archive`);
    return response.data;
  },

  getProjectHealth: async (id: string) => {
    const response = await apiClient.get<ProjectHealth>(`/projects/${id}/health`);
    return response.data;
  },
};
