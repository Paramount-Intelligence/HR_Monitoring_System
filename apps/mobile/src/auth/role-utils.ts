import type { UserRole } from '../types/user';
import {
  canAccessManage,
  normalizeRole as normalizeUserRole,
} from '../utils/role';

export type DashboardRole =
  | 'admin'
  | 'hr_operations'
  | 'manager'
  | 'team_lead'
  | 'employee'
  | 'intern';

export { canAccessManage };

export function normalizeRole(role?: string | null): UserRole {
  return normalizeUserRole(role);
}

export function resolveDashboardRole(role?: string | null): DashboardRole {
  const normalized = normalizeUserRole(role);
  if (normalized === 'junior_employee') return 'intern';
  return normalized;
}

export function getDashboardRoleLabel(role: DashboardRole): string {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'hr_operations':
      return 'HR Operations';
    case 'manager':
      return 'Manager';
    case 'team_lead':
      return 'Team Lead';
    case 'intern':
      return 'Intern';
    default:
      return 'Employee';
  }
}

export function isInternLikeRole(role?: string | null): boolean {
  const normalized = normalizeUserRole(role);
  return normalized === 'intern' || normalized === 'junior_employee';
}
