import api from './client';

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

export const reportsApi = {
  getEmployeeReport: async (start: string, end: string) => {
    const { data } = await api.get<ReportSummary>('/reports/employee', {
      params: { start_date: start, end_date: end }
    });
    return data;
  },

  getManagerReports: async (start: string, end: string) => {
    const { data } = await api.get<ReportSummary[]>('/reports/manager', {
      params: { start_date: start, end_date: end }
    });
    return data;
  },

  getHRReports: async (start: string, end: string) => {
    const { data } = await api.get<ReportSummary[]>('/reports/hr', {
      params: { start_date: start, end_date: end }
    });
    return data;
  },

  getAdminReports: async (start: string, end: string) => {
    const { data } = await api.get<ReportSummary[]>('/reports/admin', {
      params: { start_date: start, end_date: end }
    });
    return data;
  }
};
