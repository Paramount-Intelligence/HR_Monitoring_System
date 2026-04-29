import apiClient from './client';

export type EODStatus = 'Draft' | 'Generated' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Needs Revision';

export interface EODReport {
  id: string;
  user_id: string;
  user_name: string;
  date: string;
  login_time: string | null;
  logout_time: string | null;
  work_mode: 'office' | 'wfh';
  total_hours: number;
  tasks_worked_on: number;
  completed_tasks: number;
  pending_tasks: number;
  blocked_tasks: number;
  duties_performed: number;
  status: EODStatus;
  manager_comments: string | null;
  productivity_score: number;
  created_at: string;
  updated_at: string;
}

export const eodApi = {
  getMyEOD: async () => {
    const response = await apiClient.get<EODReport | null>('/eod/me');
    return response.data;
  },

  generateMyEOD: async () => {
    const response = await apiClient.post<EODReport>('/eod/me/generate');
    return response.data;
  },

  submitEOD: async () => {
    const response = await apiClient.post<EODReport>('/eod/me/submit');
    return response.data;
  },

  getTeamEODs: async () => {
    const response = await apiClient.get<EODReport[]>('/eod/team');
    return response.data;
  },

  reviewEOD: async (eodId: string, action: 'Approved' | 'Rejected' | 'Needs Revision', comments: string) => {
    const response = await apiClient.post<EODReport>(`/eod/${eodId}/review`, { action, comments });
    return response.data;
  }
};
