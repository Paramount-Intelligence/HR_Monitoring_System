const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function looksLikeUuid(value: string | null | undefined): boolean {
  if (!value) return false;
  return UUID_PATTERN.test(value.trim());
}

export function attendanceBadgeClass(status: string | null | undefined): string {
  switch ((status || '').trim()) {
    case 'Present':
    case 'Checked Out':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Late':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'On Leave':
      return 'bg-violet-50 text-violet-700 border-violet-200';
    case 'WFH':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'Absent':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    default:
      return 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-default)]';
  }
}

export function formatLoggedHours(value: unknown): string {
  const hours = Number(value);
  if (!Number.isFinite(hours)) return '0';
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}
