import {
  canAccessAdminReports,
  canAccessApprovals,
  canAccessEmployeeReports,
  canAccessManage,
  canAccessReports,
  canAccessTeamReports,
  canAccessWorkforceReports,
  normalizeRole,
} from '../utils/role';

/** Bump when shipping a new mobile feature phase bundle. */
export const FEATURE_SET_VERSION = 'mobile-phase-19';

/** Features that are implemented in source (not placeholders). */
export const FEATURE_IMPLEMENTATION = {
  alertsEnabled: true,
  slackComposerEnabled: true,
  callsEnabled: true,
  recordingsEnabled: true,
  pushEnabled: true,
  manageEnabled: true,
  reportsEnabled: true,
  offlineQueueEnabled: true,
} as const;

export type FeatureImplementationKey = keyof typeof FEATURE_IMPLEMENTATION;

export interface RoleFeatureAccess {
  role: string;
  normalizedRole: string;
  alertsTab: boolean;
  manageTab: boolean;
  reportsHub: boolean;
  employeeReports: boolean;
  teamReports: boolean;
  workforceReports: boolean;
  adminReports: boolean;
  approvals: boolean;
  callsUi: boolean;
  offlineBanner: boolean;
  pushSettings: boolean;
}

export function getRoleFeatureAccess(role?: string | null): RoleFeatureAccess {
  const normalizedRole = normalizeRole(role);
  return {
    role: role ?? 'employee',
    normalizedRole,
    alertsTab: true,
    manageTab: canAccessManage(role),
    reportsHub: canAccessReports(role),
    employeeReports: canAccessEmployeeReports(role),
    teamReports: canAccessTeamReports(role),
    workforceReports: canAccessWorkforceReports(role),
    adminReports: canAccessAdminReports(role),
    approvals: canAccessApprovals(role),
    callsUi: FEATURE_IMPLEMENTATION.callsEnabled,
    offlineBanner: FEATURE_IMPLEMENTATION.offlineQueueEnabled,
    pushSettings: FEATURE_IMPLEMENTATION.pushEnabled,
  };
}

export function getEnabledFeatureLabels(role?: string | null): string[] {
  const access = getRoleFeatureAccess(role);
  const labels: string[] = [];

  if (FEATURE_IMPLEMENTATION.alertsEnabled && access.alertsTab) labels.push('Alerts');
  if (FEATURE_IMPLEMENTATION.slackComposerEnabled) labels.push('Chat composer');
  if (FEATURE_IMPLEMENTATION.callsEnabled && access.callsUi) labels.push('Calls');
  if (FEATURE_IMPLEMENTATION.recordingsEnabled) labels.push('Call recording');
  if (FEATURE_IMPLEMENTATION.pushEnabled && access.pushSettings) labels.push('Push');
  if (FEATURE_IMPLEMENTATION.offlineQueueEnabled && access.offlineBanner) labels.push('Offline queue');
  if (FEATURE_IMPLEMENTATION.manageEnabled && access.manageTab) labels.push('Manage');
  if (FEATURE_IMPLEMENTATION.reportsEnabled && access.reportsHub) labels.push('Reports');
  if (access.approvals) labels.push('Approvals');
  if (access.teamReports) labels.push('Team reports');
  if (access.workforceReports) labels.push('Workforce reports');

  return labels;
}
