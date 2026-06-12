/**
 * Permission keys mirrored from backend (apps/api/app/core/permissions.py).
 * Mobile uses these for UX only — backend enforces all authorization.
 */
export const PERMISSIONS = {
  analyticsViewOrg: 'analytics.view_org',
  analyticsViewTeam: 'analytics.view_team',
  reportsViewOwn: 'reports.view_own',
  reportsViewTeam: 'reports.view_team',
  reportsViewOrg: 'reports.view_org',
  usersViewAll: 'users.view_all',
  callRecordingsView: 'call_recordings.view',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
