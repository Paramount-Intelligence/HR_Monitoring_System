import type { AdminDashboardTabId } from '@/components/admin/dashboard/AdminDashboardTabs';

export const ADMIN_USERS_LIST_PATH = '/admin/users';
export const ADMIN_DASHBOARD_USERS_TAB_PATH = '/admin/dashboard?tab=users';

const DASHBOARD_TAB_ALIASES: Record<string, AdminDashboardTabId> = {
  overview: 'overview',
  users: 'users',
  'user-management': 'users',
  communication: 'communication',
  projects: 'projects',
  'project-tasks': 'projects',
};

export function parseAdminDashboardTab(value: string | null | undefined): AdminDashboardTabId {
  if (!value) return 'overview';
  return DASHBOARD_TAB_ALIASES[value] ?? 'overview';
}

export function getSafeReturnTo(value: string | null | undefined): string | null {
  if (!value) return null;

  try {
    const decoded = decodeURIComponent(value);
    if (!decoded.startsWith('/admin/')) return null;
    if (decoded.startsWith('//')) return null;
    if (decoded.includes('javascript:')) return null;
    if (decoded.includes('://')) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function resolveProfileBackHref(returnToParam: string | null | undefined): string {
  return getSafeReturnTo(returnToParam) ?? ADMIN_USERS_LIST_PATH;
}

export function getProfileBackLabel(backHref: string): string {
  if (backHref.includes('/admin/dashboard')) return 'Back to Dashboard';
  if (backHref.includes('/admin/users')) return 'Back to Users';
  return 'Back';
}

export function buildAdminProfileHref(
  userId: string,
  options?: { returnTo?: string },
): string {
  const params = new URLSearchParams({ id: userId });
  if (options?.returnTo) {
    params.set('returnTo', options.returnTo);
  }
  return `/admin/users/profile?${params.toString()}`;
}
