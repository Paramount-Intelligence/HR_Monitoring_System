const FALLBACK = '—';

const TIME_12H: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
};

const DATE_SHORT: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
};

const DATE_TIME_12H: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
};

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

/** Clock time in 12-hour format, e.g. `11:26 AM`. */
export function formatTime12h(value?: string | null): string {
  const date = parseDate(value);
  if (!date) return FALLBACK;
  return date.toLocaleTimeString(undefined, TIME_12H);
}

/** Date only, e.g. `Mon, Jun 9`. */
export function formatDate(value?: string | null): string {
  const date = parseDate(value);
  if (!date) return FALLBACK;
  return date.toLocaleDateString(undefined, DATE_SHORT);
}

/** Date + time in 12-hour format, e.g. `Jun 11, 2026, 8:08 PM`. */
export function formatDateTime12h(value?: string | null): string {
  const date = parseDate(value);
  if (!date) return FALLBACK;
  return date.toLocaleString(undefined, DATE_TIME_12H);
}

/** Today/yesterday labels or date + 12-hour time. */
export function formatRelativeOrDateTime(value?: string | null): string {
  const date = parseDate(value);
  if (!date) return FALLBACK;

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const dateKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

  if (dateKey(date) === dateKey(today)) {
    return `Today, ${formatTime12h(value)}`;
  }
  if (dateKey(date) === dateKey(yesterday)) {
    return `Yesterday, ${formatTime12h(value)}`;
  }

  return formatDateTime12h(value);
}

/** Duration from minutes — not AM/PM clock format. */
export function formatDurationMinutes(minutes?: number | null): string {
  if (minutes == null || Number.isNaN(minutes)) return FALLBACK;
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins.toString().padStart(2, '0')}m`;
}

/** Duration from seconds — e.g. voice note `0:05`. */
export function formatDurationSeconds(totalSeconds?: number | null): string {
  if (totalSeconds == null || Number.isNaN(totalSeconds)) return '0:00';
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
