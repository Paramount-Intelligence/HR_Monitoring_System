import apiClient, { getErrorMessage } from './client';
import {
  CommunicationAnalyticsData,
  ProjectsTasksAnalyticsData,
  UsersAnalyticsData,
} from '@/lib/admin-dashboard/types';

export interface DashboardSummary {
  attendance_status: string;
  total_time_today: number; // minutes
  productive_time_today: number; // minutes
  active_timer_task_id: string | null;
  active_timer_task_title: string | null;
  tasks_in_progress: number;
  tasks_due_soon: number;
}

export interface DashboardAlertCard {
  key: string;
  title: string;
  count: number;
  href: string;
  severity: string;
  empty_text: string;
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
  },

  getAlertCards: async () => {
    const response = await apiClient.get<{ cards: DashboardAlertCard[] }>('/dashboard/alerts-summary');
    return response.data;
  },
  
  getAdminAnalytics: async () => {
    const response = await apiClient.get('/dashboard/admin/analytics');
    return response.data;
  },

  getUsersAnalytics: async (): Promise<UsersAnalyticsData> => {
    try {
      const response = await apiClient.get<UsersAnalyticsData>('/dashboard/admin/users-analytics');
      return response.data;
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[dashboardApi] users-analytics failed:', getErrorMessage(e));
      }
      throw e;
    }
  },

  getCommunicationAnalytics: async (): Promise<CommunicationAnalyticsData> => {
    try {
      const response = await apiClient.get<CommunicationAnalyticsData>('/dashboard/admin/communication-analytics');
      return response.data;
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[dashboardApi] communication-analytics failed:', getErrorMessage(e));
      }
      throw e;
    }
  },

  getProjectsTasksAnalytics: async (): Promise<ProjectsTasksAnalyticsData> => {
    try {
      const response = await apiClient.get<ProjectsTasksAnalyticsData>('/dashboard/admin/projects-tasks-analytics');
      return response.data;
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[dashboardApi] projects-tasks-analytics failed:', getErrorMessage(e));
      }
      throw e;
    }
  },

  getManagerOverview: async () => {
    try {
      const response = await apiClient.get('/dashboard/manager/overview');
      return response.data;
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[dashboardApi] manager/overview failed:', getErrorMessage(e));
      }
      throw e;
    }
  },

  getManagerTeamAnalytics: async () => {
    try {
      const response = await apiClient.get('/dashboard/manager/team-analytics');
      return response.data;
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[dashboardApi] manager/team-analytics failed:', getErrorMessage(e));
      }
      throw e;
    }
  },

  getManagerApprovalsAnalytics: async () => {
    try {
      const response = await apiClient.get('/dashboard/manager/approvals-analytics');
      return response.data;
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[dashboardApi] manager/approvals-analytics failed:', getErrorMessage(e));
      }
      throw e;
    }
  },

  getManagerProjectsTasksAnalytics: async (): Promise<ProjectsTasksAnalyticsData> => {
    try {
      const response = await apiClient.get<ProjectsTasksAnalyticsData>('/dashboard/manager/projects-tasks-analytics');
      return response.data;
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[dashboardApi] manager/projects-tasks-analytics failed:', getErrorMessage(e));
      }
      throw e;
    }
  },

  getManagerEodAnalytics: async () => {
    try {
      const response = await apiClient.get('/dashboard/manager/eod-reports-analytics');
      return response.data;
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[dashboardApi] manager/eod-reports-analytics failed:', getErrorMessage(e));
      }
      throw e;
    }
  },
};
