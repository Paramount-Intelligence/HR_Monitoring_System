import type { AttendanceClassification, AttendanceSession, CheckoutModalType } from '../types/attendance';
import { formatTime } from './format';

const CLASSIFICATION_LABELS: Record<AttendanceClassification, string> = {
  active: 'Checked In',
  full_day: 'Full Day',
  half_day: 'Half Day',
  short_leave: 'Insufficient Hours',
  insufficient: 'Insufficient Hours',
  full_leave: 'Full Leave',
  leave: 'Leave',
};

export function getClassificationLabel(
  classification?: AttendanceClassification | string | null
): string {
  if (!classification) return 'Unknown';
  if (classification in CLASSIFICATION_LABELS) {
    return CLASSIFICATION_LABELS[classification as AttendanceClassification];
  }
  return classification
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getSessionStatusLabel(status?: string | null): string {
  if (!status || status === 'not_checked_in') return 'Not Checked In';
  switch (status) {
    case 'active':
      return 'Checked In';
    case 'completed':
      return 'Completed';
    case 'incomplete':
      return 'Incomplete';
    case 'corrected':
      return 'Corrected';
    default:
      return status
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
  }
}

export function getCheckoutModalType(session: AttendanceSession): CheckoutModalType {
  const now = new Date();

  if (session.expected_shift_end_at) {
    const shiftEnd = new Date(session.expected_shift_end_at);
    const bufferMs = 2 * 60 * 1000;

    if (now.getTime() < shiftEnd.getTime() - bufferMs) return 'early';
    if (now.getTime() > shiftEnd.getTime() + bufferMs) return 'overtime';
    return null;
  }

  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const pkt = new Date(utc + 3600000 * 5);
  const pktHour = pkt.getHours();

  if (pktHour >= 17 || pktHour < 2) return 'early';
  if (pktHour >= 2 && pktHour < 10) return 'overtime';
  return null;
}

export function isActiveSession(session: AttendanceSession | null | undefined): boolean {
  return session?.session_status === 'active';
}

export function getWorkedMinutes(session: AttendanceSession | null | undefined): number | null {
  if (!session) return null;
  return session.worked_minutes ?? session.duration_minutes ?? null;
}

export type WorkSessionState = 'not_checked_in' | 'checked_in' | 'session_closed';

export function getWorkSessionState(
  session: AttendanceSession | null | undefined
): WorkSessionState {
  if (!session) return 'not_checked_in';
  if (session.session_status === 'active') return 'checked_in';
  if (session.check_out_at || session.session_status === 'completed') return 'session_closed';
  return 'not_checked_in';
}

export function getWorkSessionLabel(state: WorkSessionState): string {
  switch (state) {
    case 'checked_in':
      return 'Checked In';
    case 'session_closed':
      return 'Session Closed';
    default:
      return 'Not Checked In';
  }
}

export function hasSameCheckInOutTime(session: AttendanceSession | null | undefined): boolean {
  if (!session?.check_in_at || !session.check_out_at) return false;
  return formatTime(session.check_in_at) === formatTime(session.check_out_at);
}

export function getAttendanceResultLabel(
  session: AttendanceSession | null | undefined
): string | null {
  if (!session?.attendance_classification) return null;
  return getClassificationLabel(session.attendance_classification);
}

export function isZeroDurationSession(session: AttendanceSession | null | undefined): boolean {
  const minutes = getWorkedMinutes(session);
  return minutes === 0;
}
