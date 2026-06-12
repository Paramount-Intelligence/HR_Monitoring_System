import { apiClient } from './client';
import type { AttendanceSession } from '../types/attendance';
import type {
  ApprovalTimelineEntry,
  CorrectionResolvePayload,
  LeaveRequest,
  LeaveRequestResolvePayload,
} from '../types/approvals';

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

export async function getLeaveTimeline(requestId: string): Promise<ApprovalTimelineEntry[]> {
  const { data } = await apiClient.get<ApprovalTimelineEntry[]>(`/leaves/${requestId}/timeline`);
  return data;
}

export async function getPendingCorrections(): Promise<AttendanceSession[]> {
  const { data } = await apiClient.get<AttendanceSession[]>('/attendance/corrections/pending');
  return data;
}

export async function resolveCorrection(
  sessionId: string,
  payload: CorrectionResolvePayload
): Promise<AttendanceSession> {
  const { data } = await apiClient.patch<AttendanceSession>(
    `/attendance/${sessionId}/resolve-correction`,
    payload
  );
  return data;
}

export async function getApprovals() {
  const [leaves, corrections] = await Promise.all([
    getPendingLeaveRequests(),
    getPendingCorrections(),
  ]);
  return { leaves, corrections };
}

export async function approveLeaveRequest(requestId: string, managerComment?: string) {
  return resolveLeaveRequest(requestId, {
    action: 'approved',
    manager_comment: managerComment,
  });
}

export async function rejectLeaveRequest(requestId: string, managerComment?: string) {
  return resolveLeaveRequest(requestId, {
    action: 'rejected',
    manager_comment: managerComment,
  });
}

export async function approveCorrection(sessionId: string, managerComment?: string) {
  return resolveCorrection(sessionId, {
    action: 'approve',
    manager_comment: managerComment,
  });
}

export async function rejectCorrection(sessionId: string, managerComment?: string) {
  return resolveCorrection(sessionId, {
    action: 'reject',
    manager_comment: managerComment,
  });
}

export { getLeaveTimeline as getApprovalTimeline };
