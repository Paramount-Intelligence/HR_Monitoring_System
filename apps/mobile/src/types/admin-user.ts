export interface PermissionItem {
  key: string;
  label: string;
  category: string;
  description: string;
}

export interface UserPermissionsDetail {
  user_id: string;
  role: string;
  role_permissions: PermissionItem[];
  extra_permissions: PermissionItem[];
  denied_permissions: PermissionItem[];
  resolved_permissions: string[];
}

export interface SecurityActionResponse {
  message: string;
  email_sent: boolean;
  email_error?: string | null;
}

export interface UserAdminSummary {
  user_id: string;
  attendance: Record<string, unknown>;
  tasks: Record<string, unknown>;
  time_logs: Record<string, unknown>;
  leave: Record<string, unknown>;
  projects: Record<string, unknown>;
  eod: Record<string, unknown>;
  last_activity?: string | null;
  account_created_at: string;
  last_login?: string | null;
}

export interface UserAuditLogEntry {
  id: string;
  action_type: string;
  actor_user_id: string;
  actor_name?: string | null;
  old_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  created_at: string;
}

export type AdminUserTabKey =
  | 'profile'
  | 'access'
  | 'department'
  | 'permissions'
  | 'security'
  | 'activity'
  | 'audit';

export const ADMIN_USER_TABS: { id: AdminUserTabKey; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'access', label: 'Access' },
  { id: 'department', label: 'Department' },
  { id: 'permissions', label: 'Permissions' },
  { id: 'security', label: 'Security' },
  { id: 'activity', label: 'Activity' },
  { id: 'audit', label: 'Audit' },
];

export const USER_ROLE_OPTIONS = [
  { id: 'admin', label: 'Admin' },
  { id: 'hr_operations', label: 'HR Operations' },
  { id: 'manager', label: 'Manager' },
  { id: 'team_lead', label: 'Team Lead' },
  { id: 'employee', label: 'Employee' },
  { id: 'intern', label: 'Intern' },
  { id: 'junior_employee', label: 'Junior Employee' },
];

export const USER_STATUS_OPTIONS = [
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
  { id: 'suspended', label: 'Suspended' },
  { id: 'pending', label: 'Pending' },
];
