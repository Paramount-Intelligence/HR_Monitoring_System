import apiClient from './client';

export interface AttendanceExceptionItem {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  department: string | null;
  type: string;
  severity: string;
  status: string;
  business_date: string;
  shift_name: string | null;
  shift_start: string | null;
  shift_end: string | null;
  check_in_at: string | null;
  check_out_at: string | null;
  detected_at: string;
  reason: string | null;
  resolution_note: string | null;
}

export interface AttendanceExceptionsResponse {
  summary: Record<string, number>;
  exceptions: AttendanceExceptionItem[];
}

export const attendanceExceptionsApi = {
  list: async (params?: Record<string, string>) => {
    const response = await apiClient.get<AttendanceExceptionsResponse>('/attendance/exceptions', { params });
    return response.data;
  },
  resolve: async (id: string, resolution_note: string) => {
    const response = await apiClient.post(`/attendance/exceptions/${id}/resolve`, { resolution_note });
    return response.data;
  },
  dismiss: async (id: string, resolution_note?: string) => {
    const response = await apiClient.post(`/attendance/exceptions/${id}/dismiss`, { resolution_note });
    return response.data;
  },
};
