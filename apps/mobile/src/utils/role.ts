import type { UserRole } from '../types/user';

const MANAGE_ROLES: UserRole[] = ['admin', 'hr_operations', 'manager', 'team_lead'];
const ALL_USERS_ROLES: UserRole[] = ['admin', 'hr_operations'];
const MANAGER_DASHBOARD_ROLES: UserRole[] = ['admin', 'manager'];
const ADMIN_DASHBOARD_ROLES: UserRole[] = ['admin'];

const ROLE_ALIASES: Record<string, UserRole> = {
  admin: 'admin',
  administrator: 'admin',
  hr: 'hr_operations',
  hr_operations: 'hr_operations',
  hr_ops: 'hr_operations',
  'hr operations': 'hr_operations',
  hroperations: 'hr_operations',
  manager: 'manager',
  team_lead: 'team_lead',
  teamlead: 'team_lead',
  'team lead': 'team_lead',
  lead: 'team_lead',
  employee: 'employee',
  intern: 'intern',
  junior_employee: 'junior_employee',
  'junior employee': 'junior_employee',
  junior: 'junior_employee',
};

function normalizeRoleKey(role?: string | null): string {
  return (role ?? 'employee').toLowerCase().trim().replace(/[\s-]+/g, '_');
}

export function normalizeRole(role?: string | null): UserRole {
  const raw = (role ?? 'employee').toLowerCase().trim();
  const underscored = normalizeRoleKey(role);
  const spaced = raw.replace(/_/g, ' ');

  if (ROLE_ALIASES[underscored]) return ROLE_ALIASES[underscored];
  if (ROLE_ALIASES[raw]) return ROLE_ALIASES[raw];
  if (ROLE_ALIASES[spaced]) return ROLE_ALIASES[spaced];

  const known: UserRole[] = [
    'admin',
    'hr_operations',
    'manager',
    'team_lead',
    'employee',
    'intern',
    'junior_employee',
  ];
  return known.includes(underscored as UserRole) ? (underscored as UserRole) : 'employee';
}

export function canAccessManage(role?: string | null): boolean {
  return MANAGE_ROLES.includes(normalizeRole(role));
}

export function canAccessAllUsers(role?: string | null): boolean {
  return ALL_USERS_ROLES.includes(normalizeRole(role));
}

export function canAccessUsersDirectory(role?: string | null): boolean {
  return canAccessManage(role);
}

export function canAccessManagerDashboard(role?: string | null): boolean {
  return MANAGER_DASHBOARD_ROLES.includes(normalizeRole(role));
}

export function canAccessAdminDashboard(role?: string | null): boolean {
  return ADMIN_DASHBOARD_ROLES.includes(normalizeRole(role));
}

export function canAccessTeamAttendance(role?: string | null): boolean {
  return canAccessManage(role);
}

export function canAccessApprovals(role?: string | null): boolean {
  return canAccessManage(role);
}

export function isTeamScopedRole(role?: string | null): boolean {
  const normalized = normalizeRole(role);
  return normalized === 'manager' || normalized === 'team_lead';
}

export function getManageHubTitle(role?: string | null): string {
  const normalized = normalizeRole(role);
  if (normalized === 'admin') return 'Admin Manage';
  if (normalized === 'hr_operations') return 'HR Operations';
  if (normalized === 'manager') return 'Team Manage';
  if (normalized === 'team_lead') return 'Team Lead';
  return 'Manage';
}

export function canAccessReports(role?: string | null): boolean {
  return true;
}

export function canAccessEmployeeReports(role?: string | null): boolean {
  return true;
}

export function canAccessTeamReports(role?: string | null): boolean {
  const normalized = normalizeRole(role);
  return ['admin', 'manager', 'team_lead'].includes(normalized);
}

export function canAccessWorkforceReports(role?: string | null): boolean {
  return canAccessAllUsers(normalizeRole(role));
}

export function canAccessAdminReports(role?: string | null): boolean {
  return normalizeRole(role) === 'admin';
}

export function canAccessApprovalSummaryReport(role?: string | null): boolean {
  return canAccessManage(role);
}
