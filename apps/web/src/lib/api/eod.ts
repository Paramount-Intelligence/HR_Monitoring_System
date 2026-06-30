import apiClient from './client';

export type EODStatus = 'Draft' | 'Generated' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Needs Revision';

export interface EodAttendanceSummary {
  work_mode: string | null;
  check_in_at: string | null;
  check_out_at: string | null;
  total_hours: number;
  status: string;
}

export interface EodTaskMetrics {
  tasks_worked_on: number;
  completed: number;
  pending: number;
  blocked: number;
  key_actions: number;
}

export interface EodTimeLogEntry {
  id: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number;
  duration_hours: number;
  source: 'timer' | 'manual' | string;
  note: string | null;
  is_active: boolean;
}

export interface EodTaskBreakdownItem {
  task_id: string;
  task_title: string;
  project_id: string | null;
  project_name: string | null;
  status: string;
  priority: string | null;
  completed_at: string | null;
  completed_by_name: string | null;
  total_logged_seconds: number;
  total_logged_hours: number;
  sessions_count: number;
  time_logs: EodTimeLogEntry[];
}

export interface EODReport {
  id: string;
  user_id: string;
  user_name: string;
  date: string;
  report_date?: string;
  login_time: string | null;
  logout_time: string | null;
  work_mode: 'office' | 'wfh' | string;
  total_hours: number;
  logged_hours?: number;
  tasks_worked_on: number;
  completed_tasks: number;
  pending_tasks: number;
  blocked_tasks: number;
  duties_performed: number;
  status: EODStatus;
  manager_comments: string | null;
  productivity_score: number;
  work_summary: string | null;
  blockers: string | null;
  next_day_plan: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  attendance_status?: string | null;
  window_start?: string | null;
  window_end?: string | null;
  shift_window_start?: string | null;
  shift_window_end?: string | null;
  attendance_summary?: EodAttendanceSummary | null;
  task_metrics?: EodTaskMetrics | null;
  task_breakdown?: EodTaskBreakdownItem[];
}

export interface EODSubmitPayload {
  report_date?: string;
  work_summary: string;
  blockers?: string;
  next_day_plan?: string;
}

export const eodApi = {
  getMyEOD: async (date?: string) => {
    const response = await apiClient.get<EODReport | null>('/eod/me', {
      params: date ? { date } : undefined,
    });
    return response.data;
  },

  getMyTodayEod: async () => {
    const response = await apiClient.get<EODReport | null>('/eod/me/today');
    return response.data;
  },

  getMyEodByDate: async (date: string) => {
    const response = await apiClient.get<EODReport | null>('/eod/me', {
      params: { date },
    });
    return response.data;
  },

  generateMyEOD: async () => {
    const response = await apiClient.post<EODReport>('/eod/me/generate');
    return response.data;
  },

  submitMyEod: async (payload: EODSubmitPayload) => {
    const response = await apiClient.post<EODReport>('/eod/me/submit', payload);
    return response.data;
  },

  getTeamEODs: async (params?: { search?: string; status?: string; report_date?: string }) => {
    const response = await apiClient.get<EODReport[]>('/eod/team', { params });
    return response.data;
  },

  reviewEOD: async (eodId: string, action: 'Approved' | 'Rejected' | 'Needs Revision', comments: string) => {
    const response = await apiClient.post<EODReport>(`/eod/${eodId}/review`, { action, comments });
    return response.data;
  },
};
