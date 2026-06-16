import { apiClient } from './client';
import type { AttendanceSession } from '../types/attendance';
import type {
  LeaveRequest,
  LeaveRequestCreatePayload,
  LeaveRequestResolvePayload,
  ApprovalTimelineEntry,
} from '../types/approvals';

export async function getMyLeaveRequests(): Promise<LeaveRequest[]> {
  const { data } = await apiClient.get<LeaveRequest[]>('/leaves/me');
  return data;
}

export async function submitLeaveRequest(payload: LeaveRequestCreatePayload): Promise<LeaveRequest> {
  const { data } = await apiClient.post<LeaveRequest>('/leaves', payload);
  return data;
}

export async function getLeaveTimeline(requestId: string): Promise<ApprovalTimelineEntry[]> {
  const { data } = await apiClient.get<ApprovalTimelineEntry[]>(`/leaves/${requestId}/timeline`);
  return data;
}

export async function getPendingLeaveRequests(): Promise<LeaveRequest[]> {
  const { data } = await apiClient.get<LeaveRequest[]>('/leaves/pending');
  return data;
}

export async function resolveLeaveRequest(
  requestId: string,
  payload: LeaveRequestResolvePayload
): Promise<LeaveRequest> {
  const { data } = await apiClient.patch<LeaveRequest>(`/leaves/${requestId}/resolve`, payload);
  return data;
}
