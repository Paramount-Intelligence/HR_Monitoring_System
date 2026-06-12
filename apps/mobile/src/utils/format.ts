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

export function formatTime(iso?: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDuration(minutes?: number | null): string {
  if (minutes == null || Number.isNaN(minutes)) return '—';
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins.toString().padStart(2, '0')}m`;
}

export function formatStatusLabel(status?: string | null): string {
  if (!status) return '—';
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
