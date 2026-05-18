import apiClient from './client';

export interface AttendanceSession {
  id: string;
  user_id: string;
  check_in_at: string;
  check_out_at: string | null;
  work_mode: 'office' | 'wfh';
  session_status: 'active' | 'completed' | 'incomplete' | 'corrected';
  attendance_classification: 'active' | 'full_day' | 'half_day' | 'short_leave' | 'insufficient' | 'leave';
  is_late_login: boolean;
  is_early_logout: boolean;
  is_overtime: boolean;
  is_corrected: boolean;
  correction_requested: boolean;
  correction_reason: string | null;
  
  worked_minutes: number | null;
  late_minutes: number | null;
  early_checkout_minutes: number | null;
  
  checkout_after_shift_reason: string | null;
  checkout_after_shift_note: string | null;
  
  expected_shift_start_at: string | null;
  expected_shift_end_at: string | null;
  
  total_hours?: number;
  created_at: string;
  updated_at: string;

  total_break_minutes?: number;
  dinner_break_minutes?: number;
  prayer_break_minutes?: number;
  other_break_minutes?: number;
  breaks?: AttendanceBreak[];
  active_break?: AttendanceBreak | null;
}

export interface AttendanceBreak {
  id: string;
  attendance_session_id: string;
  break_type: 'dinner' | 'prayer' | 'other';
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  note: string | null;
  is_paid: boolean;
}

export const attendanceApi = {
  checkIn: async (workMode: 'office' | 'wfh') => {
    const response = await apiClient.post<AttendanceSession>('/attendance/check-in', {
      work_mode: workMode
    });
    return response.data;
  },

  checkOut: async (justification?: { checkout_after_shift_reason?: string; checkout_after_shift_note?: string; early_checkout_reason?: string }) => {
    const response = await apiClient.post<AttendanceSession>('/attendance/check-out', justification || {});
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

  startBreak: async (breakType: string, note?: string) => {
    const response = await apiClient.post<AttendanceBreak>('/attendance/breaks/start', {
      break_type: breakType,
      note
    });
    return response.data;
  },

  endBreak: async () => {
    const response = await apiClient.post<AttendanceBreak>('/attendance/breaks/end');
    return response.data;
  },

  getCurrentBreak: async () => {
    const response = await apiClient.get<AttendanceBreak | null>('/attendance/breaks/current');
    return response.data;
  },
};
