export type LeaveType = 'sick' | 'casual' | 'annual' | 'half_day' | 'wfh';

export type LeaveStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'escalated'
  | 'cancelled'
  | 'needs_clarification';

export type ApprovalAction =
  | 'created'
  | 'clarified'
  | 'approved'
  | 'rejected'
  | 'escalated'
  | 'cancelled';

export type ApprovalKind = 'leave' | 'correction';

export interface LeaveRequest {
  id: string;
  user_id: string;
  user_full_name?: string | null;
  start_date: string;
  end_date: string;
  leave_type: LeaveType;
  status: LeaveStatus;
  is_half_day: boolean;
  half_day_period: 'first_half' | 'second_half' | null;
  reason: string;
  manager_comment: string | null;
  current_approver_id: string | null;
  escalated_from_id: string | null;
  escalated_at: string | null;
  escalation_count: number;
  created_at: string;
  updated_at: string;
}

export interface LeaveRequestResolvePayload {
  action: ApprovalAction;
  manager_comment?: string;
}

export interface LeaveRequestCreatePayload {
  start_date: string;
  end_date: string;
  leave_type: LeaveType;
  reason: string;
  is_half_day?: boolean;
  half_day_period?: 'first_half' | 'second_half' | null;
}

export interface CorrectionResolvePayload {
  action: 'approve' | 'reject' | 'clarify';
  check_in_at?: string;
  check_out_at?: string;
  manager_comment?: string;
}

export interface ApprovalTimelineEntry {
  id: string;
  actor_id: string;
  actor_name?: string;
  action: ApprovalAction;
  comment: string | null;
  created_at: string;
}

export interface UnifiedApprovalItem {
  id: string;
  kind: ApprovalKind;
  requesterName: string;
  requesterId: string;
  title: string;
  subtitle: string;
  status: string;
  submittedAt: string;
  leaveRequest?: LeaveRequest;
  correctionSession?: import('./attendance').AttendanceSession;
}
