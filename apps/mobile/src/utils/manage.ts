import { useMemo } from 'react';
import type { LeaveRequest, UnifiedApprovalItem } from '../types/approvals';
import type { AttendanceSession } from '../types/attendance';

export function formatLeaveType(type: string): string {
  if (type === 'wfh') return 'Work From Home';
  return type.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function mapLeaveToApproval(leave: LeaveRequest): UnifiedApprovalItem {
  const dateRange =
    leave.start_date === leave.end_date
      ? leave.start_date
      : `${leave.start_date} → ${leave.end_date}`;

  return {
    id: leave.id,
    kind: 'leave',
    requesterName: leave.user_full_name ?? 'Employee',
    requesterId: leave.user_id,
    title: formatLeaveType(leave.leave_type),
    subtitle: `${dateRange}${leave.reason ? ` · ${leave.reason}` : ''}`,
    status: leave.status,
    submittedAt: leave.created_at,
    leaveRequest: leave,
  };
}

export function mapCorrectionToApproval(session: AttendanceSession): UnifiedApprovalItem {
  return {
    id: session.id,
    kind: 'correction',
    requesterName: session.user_full_name ?? 'Employee',
    requesterId: session.user_id,
    title: 'Attendance Correction',
    subtitle: session.correction_reason ?? 'Correction requested',
    status: 'pending',
    submittedAt: session.updated_at,
    correctionSession: session,
  };
}

export function useUnifiedApprovals(
  leaves: LeaveRequest[] | undefined,
  corrections: AttendanceSession[] | undefined,
  filter: 'all' | 'leave' | 'correction'
): UnifiedApprovalItem[] {
  return useMemo(() => {
    const leaveItems = (leaves ?? []).map(mapLeaveToApproval);
    const correctionItems = (corrections ?? []).map(mapCorrectionToApproval);

    if (filter === 'leave') return leaveItems;
    if (filter === 'correction') return correctionItems;

    return [...leaveItems, ...correctionItems].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  }, [corrections, filter, leaves]);
}

export function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
