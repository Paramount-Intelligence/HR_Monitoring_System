import { apiClient } from './client';
import type {
  AttendanceSession,
  CheckInPayload,
  CheckOutPayload,
} from '../types/attendance';

export async function getActiveSession(): Promise<AttendanceSession | null> {
  const { data } = await apiClient.get<AttendanceSession | null>('/attendance/active');
  return data;
}

export async function getAttendanceHistory(): Promise<AttendanceSession[]> {
  const { data } = await apiClient.get<AttendanceSession[]>('/attendance/me');
  return data;
}

export async function getTeamAttendanceSessions(params?: {
  date_from?: string;
  date_to?: string;
}): Promise<AttendanceSession[]> {
  const { data } = await apiClient.get<AttendanceSession[]>('/attendance/team', { params });
  return data;
}

export async function checkIn(payload: CheckInPayload): Promise<AttendanceSession> {
  const { data } = await apiClient.post<AttendanceSession>('/attendance/check-in', payload);
  return data;
}

export async function checkOut(payload: CheckOutPayload = {}): Promise<AttendanceSession> {
  const { data } = await apiClient.post<AttendanceSession>('/attendance/check-out', payload);
  return data;
}
