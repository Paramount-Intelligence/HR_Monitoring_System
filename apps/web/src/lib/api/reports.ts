import api from './client';
import type { ReportPeriod } from '@/lib/reports/report-filters';

export interface ReportSummary {
  user_id: string;
  user_name: string;
  start_date: string;
  end_date: string;
  total_hours: number;
  late_logins: number;
  early_logouts: number;
  absences: number;
  wfh_days: number;
}

export interface TeamPerformanceSummary {
  team_hours: number;
  total_exceptions: number;
  team_absences: number;
  late_count: number;
  early_count: number;
  wfh_count: number;
}

export interface TeamPerformanceRow {
  user_id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  designation: string | null;
  avatar_url: string | null;
  presence_status: string | null;
  hours: number;
  late_count: number;
  early_count: number;
  wfh_count: number;
  absence_count: number;
  completed_tasks: number;
  tasks_worked_on: number;
  eod_status: string;
  eod_submitted_days: number | null;
}

export interface TeamPerformanceReport {
  period: ReportPeriod;
  start_date: string;
  end_date: string;
  timezone: string;
  summary: TeamPerformanceSummary;
  rows: TeamPerformanceRow[];
  total_count: number;
  page: number;
  page_size: number;
}

export interface TeamPerformanceQuery {
  period: ReportPeriod;
  date?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
  department_id?: string;
  role?: string;
  page?: number;
  page_size?: number;
}

export const reportsApi = {
  getEmployeeReport: async (start: string, end: string) => {
    const { data } = await api.get<ReportSummary>('/reports/employee', {
      params: { start_date: start, end_date: end },
    });
    return data;
  },

  getManagerReports: async (start: string, end: string) => {
    const { data } = await api.get<ReportSummary[]>('/reports/manager', {
      params: { start_date: start, end_date: end },
    });
    return data;
  },

  getTeamPerformance: async (query: TeamPerformanceQuery) => {
    const { data } = await api.get<TeamPerformanceReport>('/reports/team-performance', {
      params: query,
    });
    return data;
  },

  exportTeamPerformance: async (query: TeamPerformanceQuery) => {
    const response = await api.get('/reports/team-performance/export', {
      params: query,
      responseType: 'blob',
    });
    return response.data as Blob;
  },

  getHRReports: async (start: string, end: string) => {
    const { data } = await api.get<ReportSummary[]>('/reports/hr', {
      params: { start_date: start, end_date: end },
    });
    return data;
  },

  getAdminReports: async (start: string, end: string) => {
    const { data } = await api.get<ReportSummary[]>('/reports/admin', {
      params: { start_date: start, end_date: end },
    });
    return data;
  },
};
