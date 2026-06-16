export type WorkMode = 'office' | 'wfh';

export type SessionStatus = 'active' | 'completed' | 'incomplete' | 'corrected';

export type AttendanceClassification =
  | 'active'
  | 'full_day'
  | 'half_day'
  | 'short_leave'
  | 'insufficient'
  | 'full_leave'
  | 'leave';

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

export interface AttendanceSession {
  id: string;
  user_id: string;
  user_full_name?: string | null;
  check_in_at: string;
  check_out_at: string | null;
  work_mode: WorkMode;
  session_status: SessionStatus;
  attendance_classification: AttendanceClassification;
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
  duration_minutes?: number | null;
  total_hours?: number | null;
  total_break_minutes?: number;
  dinner_break_minutes?: number;
  prayer_break_minutes?: number;
  other_break_minutes?: number;
  breaks?: AttendanceBreak[];
  active_break?: AttendanceBreak | null;
  created_at: string;
  updated_at: string;
}

export interface CheckInPayload {
  work_mode: WorkMode;
}

export interface CheckOutPayload {
  checkout_after_shift_reason?: string;
  checkout_after_shift_note?: string;
  early_checkout_reason?: string;
}

export type CheckoutModalType = 'early' | 'overtime' | null;

export type AfterShiftCheckoutReason = 'overtime' | 'forgot_checkout';

export interface CorrectionRequestPayload {
  requested_check_in_at?: string;
  requested_check_out_at?: string;
  reason: string;
}
