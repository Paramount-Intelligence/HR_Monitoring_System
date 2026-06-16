export {
  formatTime12h as formatTime,
  formatDate,
  formatDateTime12h as formatDateTime,
  formatRelativeOrDateTime,
  formatDurationMinutes as formatDuration,
  formatDurationSeconds,
} from './date-time';

export function formatRole(role?: string | null): string {
  if (!role || typeof role !== 'string') return 'Employee';
  return role
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getInitials(name?: string | null): string {
  if (!name?.trim()) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function safeText(value: unknown, fallback = '—'): string {
  if (value == null) return fallback;
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && !Number.isNaN(value)) return String(value);
  return fallback;
}

export function getGreeting(name?: string | null): string {
  const hour = new Date().getHours();
  const prefix =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = name?.trim().split(/\s+/)[0];
  return firstName ? `${prefix}, ${firstName}` : `${prefix}`;
}

export function formatStatusLabel(status?: string | null): string {
  if (!status) return '—';
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
