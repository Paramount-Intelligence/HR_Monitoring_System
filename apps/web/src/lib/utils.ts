import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function cleanReason(reason: string | null | undefined): string {
  if (!reason) return "—"
  let cleaned = String(reason).trim()
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.substring(1, cleaned.length - 1).trim()
  }
  return cleaned
}

export function formatSafeDurationFromSeconds(secondsInput: unknown): string {
  const seconds = Number(secondsInput);
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  if (seconds === 0) return "0m";
  if (seconds > 0 && seconds < 60) return "< 1m";
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

export function formatAttendanceDuration(session: any): string {
  if (!session) return "—";

  const status = String(session.session_status || session.status || "").toLowerCase();

  // Active session with no checkout
  if (
    !session.check_out_at &&
    !session.check_out_time &&
    (session.is_active || status === "active")
  ) {
    return "Active";
  }

  // Try duration_seconds / total_seconds first (most precise)
  for (const candidate of [session.duration_seconds, session.total_seconds]) {
    const s = Number(candidate);
    if (Number.isFinite(s) && s >= 0) return formatSafeDurationFromSeconds(s);
  }

  // Try worked_minutes
  const wm = Number(session.worked_minutes);
  if (Number.isFinite(wm) && wm >= 0) return formatSafeDurationFromSeconds(wm * 60);

  // Try total_hours
  const th = Number(session.total_hours);
  if (Number.isFinite(th) && th >= 0) return formatSafeDurationFromSeconds(th * 3600);

  // Fall back to calculating from timestamps
  const checkInRaw = session.check_in_at || session.check_in_time || session.check_in;
  const checkOutRaw = session.check_out_at || session.check_out_time || session.check_out;

  if (!checkInRaw || !checkOutRaw) return "—";

  const checkInMs = new Date(checkInRaw).getTime();
  const checkOutMs = new Date(checkOutRaw).getTime();

  if (!Number.isFinite(checkInMs) || !Number.isFinite(checkOutMs)) return "—";

  const diffSeconds = Math.floor((checkOutMs - checkInMs) / 1000);
  return formatSafeDurationFromSeconds(diffSeconds);
}


