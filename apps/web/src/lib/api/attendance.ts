import apiClient from './client';

export interface AttendanceSession {
  id: string;
  user_id: string;
  check_in_at: string;
  check_out_at: string | null;
  work_mode: 'office' | 'wfh';
  session_status: 'active' | 'completed' | 'incomplete' | 'corrected';
  attendance_classification: 'active' | 'full_day' | 'half_day' | 'insufficient' | 'leave';
  is_late_login: boolean;
  is_early_logout: boolean;
  is_corrected: boolean;
  correction_requested: boolean;
  correction_reason: string | null;
  created_at: string;
  updated_at: string;
}

export const attendanceApi = {
  checkIn: async (workMode: 'office' | 'wfh') => {
    const response = await apiClient.post<AttendanceSession>('/attendance/check-in', {
      work_mode: workMode
    });
    return response.data;
  },

  checkOut: async (notes?: string) => {
    const response = await apiClient.post<AttendanceSession>('/attendance/check-out', {
      notes
    });
    return response.data;
  },

  getMySessions: async () => {
    const response = await apiClient.get<AttendanceSession[]>('/attendance/me');
    return response.data;
  },

  getTeamSessions: async () => {
    const response = await apiClient.get<AttendanceSession[]>('/attendance/team');
    return response.data;
  },

  requestCorrection: async (sessionId: string, reason: string) => {
    const response = await apiClient.patch<AttendanceSession>(`/attendance/${sessionId}/correction-request`, {
      reason,
    });
    return response.data;
  },

  getPendingCorrections: async () => {
    const response = await apiClient.get<AttendanceSession[]>('/attendance/corrections/pending');
    return response.data;
  },

  resolveCorrection: async (
    sessionId: string, 
    data: { action: 'approve' | 'reject'; check_in_at?: string; check_out_at?: string }
  ) => {
    const response = await apiClient.patch<AttendanceSession>(
      `/attendance/${sessionId}/resolve-correction`,
      data
    );
    return response.data;
  },
};
