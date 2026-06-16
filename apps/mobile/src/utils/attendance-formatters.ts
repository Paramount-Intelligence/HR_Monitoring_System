import type { AttendanceSession } from '../types/attendance';
import type { StatusBadgeVariant } from '../components/ui/StatusBadge';
import { getWorkedMinutes, getWorkSessionState } from './attendance';
import { formatTime, safeText } from './format';
import { colors } from '../theme';

export interface AttendanceStatusDisplay {
  label: string;
  variant: StatusBadgeVariant;
}

export function formatShiftWindow(
  session: AttendanceSession | null | undefined,
  fallback?: string | null
): string {
  if (session?.expected_shift_start_at && session?.expected_shift_end_at) {
    return `${formatTime(session.expected_shift_start_at)} – ${formatTime(session.expected_shift_end_at)}`;
  }
  return safeText(fallback, '—');
}

export function getSessionStatusDisplay(
  session: AttendanceSession | null | undefined
): AttendanceStatusDisplay {
  if (!session) {
    return { label: 'Not started', variant: 'neutral' };
  }

  const workState = getWorkSessionState(session);
  const hasCheckIn = Boolean(session.check_in_at);

  if (workState === 'checked_in') {
    if (session.work_mode === 'wfh') {
      return { label: 'WFH · Checked in', variant: 'info' };
    }
    return { label: 'Office · Checked in', variant: 'success' };
  }

  if (session.correction_requested) {
    return { label: 'Pending correction', variant: 'warning' };
  }

  if (workState === 'session_closed' || session.check_out_at) {
    switch (session.attendance_classification) {
      case 'full_day':
        return { label: 'Present · Checked out', variant: 'success' };
      case 'half_day':
        return { label: 'Half day · Checked out', variant: 'warning' };
      case 'short_leave':
      case 'insufficient':
        return { label: 'Insufficient hours', variant: 'warning' };
      default:
        if (session.work_mode === 'wfh') {
          return { label: 'WFH · Checked out', variant: 'info' };
        }
        return { label: 'Checked out', variant: 'neutral' };
    }
  }

  if (
    (session.attendance_classification === 'full_leave' ||
      session.attendance_classification === 'leave') &&
    !hasCheckIn
  ) {
    return { label: 'On leave', variant: 'info' };
  }

  if (session.attendance_classification === 'active' && hasCheckIn) {
    return session.work_mode === 'wfh'
      ? { label: 'WFH · Checked in', variant: 'info' }
      : { label: 'Office · Checked in', variant: 'success' };
  }

  return { label: 'Not started', variant: 'neutral' };
}

export function getHistoryAccentColor(session: AttendanceSession): string {
  if (session.correction_requested) return colors.warning;
  if (session.attendance_classification === 'full_leave' || session.attendance_classification === 'leave') {
    return colors.secondary;
  }
  if (
    session.attendance_classification === 'short_leave' ||
    session.attendance_classification === 'insufficient' ||
    session.is_late_login ||
    session.is_early_logout
  ) {
    return colors.warning;
  }
  if (session.session_status === 'active') return colors.info;
  if (session.attendance_classification === 'full_day') return colors.success;
  return colors.primary;
}

export function getLateEarlyBadges(session: AttendanceSession): AttendanceStatusDisplay[] {
  const badges: AttendanceStatusDisplay[] = [];
  if (session.is_late_login) {
    const mins = session.late_minutes;
    badges.push({
      label: mins != null && mins > 0 ? `Late ${mins}m` : 'Late check-in',
      variant: 'warning',
    });
  }
  if (session.is_early_logout) {
    const mins = session.early_checkout_minutes;
    badges.push({
      label: mins != null && mins > 0 ? `Early ${mins}m` : 'Early checkout',
      variant: 'warning',
    });
  }
  if (session.is_overtime) {
    badges.push({ label: 'Overtime', variant: 'info' });
  }
  if (session.work_mode === 'wfh') {
    badges.push({ label: 'WFH', variant: 'info' });
  }
  return badges;
}

export function getWorkModeLabel(mode?: string | null): string {
  if (mode === 'wfh') return 'Work from home';
  if (mode === 'office') return 'Office';
  return '—';
}

export function canRequestCorrection(session: AttendanceSession | null | undefined): boolean {
  if (!session) return false;
  if (session.correction_requested) return false;
  if (session.session_status === 'active') return false;
  return Boolean(session.check_in_at);
}

export function getHistoryTimeRange(session: AttendanceSession): string {
  const checkIn = formatTime(session.check_in_at);
  const checkOut = formatTime(session.check_out_at);
  if (checkOut === '—') return checkIn;
  return `${checkIn} – ${checkOut}`;
}

export function getHistoryDurationLabel(session: AttendanceSession): string {
  return formatDurationMinutes(getWorkedMinutes(session));
}

function formatDurationMinutes(minutes: number | null): string {
  if (minutes == null || Number.isNaN(minutes)) return '—';
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins.toString().padStart(2, '0')}m`;
}

export function getCorrectionStatusLabel(session: AttendanceSession): string | null {
  if (session.is_corrected) return 'Approved';
  if (session.correction_requested) return 'Pending';
  return null;
}
