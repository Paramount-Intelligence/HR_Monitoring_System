export const ALL_ROLES = [
  'admin',
  'hr_operations',
  'manager',
  'team_lead',
  'employee',
  'intern',
  'junior_employee',
] as const;

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  hr_operations: 'HR & Operations',
  manager: 'Manager',
  team_lead: 'Team Lead',
  employee: 'Employee',
  intern: 'Intern',
  junior_employee: 'Junior Employee',
};

export const ROLE_BADGE_COLORS: Record<string, string> = {
  admin: 'bg-[var(--status-info-bg)] text-[var(--status-info-text)] border-[var(--status-info-border)]',
  hr_operations: 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] border-[var(--status-danger-border)]',
  manager: 'bg-[var(--accent-secondary)]/15 text-[var(--accent-secondary)] border-[var(--accent-secondary)]/30',
  team_lead: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]',
  employee: 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)]',
  intern: 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)]',
  junior_employee: 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)]',
};

export const HIGH_RISK_PERMISSIONS = new Set([
  'users.manage_roles',
  'users.manage_permissions',
  'permissions.manage',
]);

export const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'invited', label: 'Invited' },
];
