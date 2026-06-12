import { formatPKDate } from '@/lib/time';
import { safeArray, safeNumber } from '@/lib/admin-dashboard/utils';

export { safeArray, safeNumber };

export function formatOrgDate(value: unknown): string {
  if (!value || typeof value !== 'string') return '—';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return formatPKDate(value);
  } catch {
    return '—';
  }
}

export function formatShiftTime(value: unknown): string {
  if (!value || typeof value !== 'string') return '—';
  const parts = value.split(':');
  if (parts.length < 2) return value;
  const h = parseInt(parts[0], 10);
  const m = parts[1].padStart(2, '0');
  if (Number.isNaN(h)) return '—';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

export function formatAudience(audience: unknown): string {
  if (!audience || typeof audience !== 'string') return '—';
  if (audience === 'all') return 'All Employees';
  return audience.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatDepartmentHead(dept: Record<string, unknown>): string {
  const name = dept.head_name || dept.admin_name;
  if (name && typeof name === 'string' && name.trim()) return name;
  return '—';
}

export function formatUserNameById(userId: unknown, users: Record<string, unknown>[]): string {
  if (!userId || typeof userId !== 'string') return '—';
  const user = users.find((u) => u.id === userId);
  return user?.full_name && typeof user.full_name === 'string' ? user.full_name : '—';
}

export function countEmployeesInDepartment(
  deptId: string,
  deptName: string,
  users: Record<string, unknown>[]
): number {
  return users.filter(
    (u) =>
      u.department_id === deptId ||
      (u.department && typeof u.department === 'string' && u.department === deptName)
  ).length;
}

export function isOvernightShift(startTime: string, endTime: string): boolean {
  if (!startTime || !endTime) return false;
  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  return toMinutes(endTime) <= toMinutes(startTime);
}

export function isUpcomingHoliday(dateStr: string, today: Date = new Date()): boolean {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return d >= todayStart;
}

export function isPastHoliday(dateStr: string, today: Date = new Date()): boolean {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return d < todayStart;
}

export function isThisMonthHoliday(dateStr: string, today: Date = new Date()): boolean {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
}

export function isThisWeekAnnouncement(dateStr: string): boolean {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  return d >= weekAgo;
}
