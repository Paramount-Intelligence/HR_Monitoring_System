export type DashboardRole = 'admin' | 'manager' | 'employee' | 'intern' | 'hr';

export type DashboardCardKey =
  | 'attendance_exceptions'
  | 'pending_approvals'
  | 'eod_pending_review'
  | 'absent_today'
  | 'long_running_timers'
  | 'overdue_tasks'
  | 'pending_eod_reviews'
  | 'team_attendance_exceptions'
  | 'direct_reports_absent'
  | 'team_overdue_tasks'
  | 'team_blockers'
  | 'my_eod_pending'
  | 'my_overdue_tasks'
  | 'missing_checkout'
  | 'active_timer'
  | 'task_deadline_near'
  | 'important_announcement'
  | 'pending_leave_requests'
  | 'pending_wfh_requests'
  | 'total_employees'
  | 'present_today'
  | 'active_tasks'
  | 'open_tickets'
  | 'upcoming_meetings'
  | 'team_members'
  | 'tasks_in_progress'
  | 'completed_today'
  | 'logged_hours_today'
  | 'my_active_tasks'
  | 'attendance_status'
  | 'leave_balance'
  | 'upcoming_holiday'
  | 'on_leave_today'
  | 'wfh_today'
  | 'open_support_tickets';

export interface DashboardActionCardMeta {
  key: DashboardCardKey;
  title: string;
  chipLabel: string;
  activeText: string;
  href: string;
}

export interface DashboardRoleCardConfig {
  actionCards: DashboardCardKey[];
  overviewCards: DashboardCardKey[];
}

export const dashboardCardConfig: Record<DashboardRole, DashboardRoleCardConfig> = {
  admin: {
    actionCards: [
      'attendance_exceptions',
      'pending_approvals',
      'eod_pending_review',
      'absent_today',
      'long_running_timers',
      'overdue_tasks',
    ],
    overviewCards: [
      'total_employees',
      'present_today',
      'active_tasks',
      'open_tickets',
      'upcoming_meetings',
    ],
  },
  manager: {
    actionCards: [
      'pending_eod_reviews',
      'team_attendance_exceptions',
      'direct_reports_absent',
      'team_overdue_tasks',
      'team_blockers',
      'long_running_timers',
    ],
    overviewCards: [
      'team_members',
      'present_today',
      'tasks_in_progress',
      'completed_today',
      'logged_hours_today',
      'upcoming_meetings',
    ],
  },
  employee: {
    actionCards: [
      'my_eod_pending',
      'my_overdue_tasks',
      'missing_checkout',
      'active_timer',
      'task_deadline_near',
      'important_announcement',
    ],
    overviewCards: [
      'logged_hours_today',
      'my_active_tasks',
      'completed_today',
      'attendance_status',
      'leave_balance',
      'upcoming_holiday',
    ],
  },
  intern: {
    actionCards: [
      'my_eod_pending',
      'my_overdue_tasks',
      'missing_checkout',
      'active_timer',
      'task_deadline_near',
    ],
    overviewCards: [
      'logged_hours_today',
      'my_active_tasks',
      'completed_today',
      'attendance_status',
      'upcoming_holiday',
    ],
  },
  hr: {
    actionCards: [
      'attendance_exceptions',
      'pending_leave_requests',
      'pending_wfh_requests',
      'missing_checkout',
      'absent_today',
      'pending_approvals',
    ],
    overviewCards: [
      'total_employees',
      'present_today',
      'on_leave_today',
      'wfh_today',
      'open_support_tickets',
      'upcoming_holiday',
    ],
  },
};

export const dashboardActionCardMeta: Record<DashboardRole, Partial<Record<DashboardCardKey, DashboardActionCardMeta>>> = {
  admin: {
    attendance_exceptions: { key: 'attendance_exceptions', title: 'Open attendance exceptions', chipLabel: 'Attendance exceptions', activeText: 'Needs review', href: '/admin/attendance-exceptions' },
    pending_approvals: { key: 'pending_approvals', title: 'Pending approvals', chipLabel: 'Approvals', activeText: 'Awaiting decision', href: '/admin/approvals' },
    eod_pending_review: { key: 'eod_pending_review', title: 'EODs pending review', chipLabel: 'EOD reviews', activeText: 'Review required', href: '/admin/eod-reviews' },
    absent_today: { key: 'absent_today', title: 'Users absent today', chipLabel: 'Absent today', activeText: 'Attendance issue', href: '/admin/attendance-exceptions?type=absent' },
    long_running_timers: { key: 'long_running_timers', title: 'Active timers running', chipLabel: 'Active timers', activeText: 'Monitor sessions', href: '/admin/reports?tab=time-logs' },
    overdue_tasks: { key: 'overdue_tasks', title: 'Overdue tasks', chipLabel: 'Overdue tasks', activeText: 'Needs follow-up', href: '/admin/tasks?status=overdue' },
  },
  manager: {
    pending_eod_reviews: { key: 'pending_eod_reviews', title: 'Pending EOD reviews', chipLabel: 'EOD reviews', activeText: 'Review required', href: '/manager/eod-reviews' },
    team_attendance_exceptions: { key: 'team_attendance_exceptions', title: 'Team attendance exceptions', chipLabel: 'Attendance exceptions', activeText: 'Needs review', href: '/manager/attendance-exceptions' },
    direct_reports_absent: { key: 'direct_reports_absent', title: 'Direct reports absent', chipLabel: 'Absent today', activeText: 'Attendance issue', href: '/manager/attendance-exceptions?type=absent' },
    team_overdue_tasks: { key: 'team_overdue_tasks', title: 'Team overdue tasks', chipLabel: 'Overdue tasks', activeText: 'Needs follow-up', href: '/manager/tasks?status=overdue' },
    team_blockers: { key: 'team_blockers', title: 'Team blockers', chipLabel: 'Blockers', activeText: 'Unblock work', href: '/manager/tasks?status=blocked' },
    long_running_timers: { key: 'long_running_timers', title: 'Active timers running', chipLabel: 'Active timers', activeText: 'Monitor sessions', href: '/manager/time-logs' },
  },
  employee: {
    my_eod_pending: { key: 'my_eod_pending', title: 'My EOD pending', chipLabel: 'EOD pending', activeText: 'Submit today', href: '/employee/eod' },
    my_overdue_tasks: { key: 'my_overdue_tasks', title: 'My overdue tasks', chipLabel: 'Overdue tasks', activeText: 'Needs action', href: '/employee/tasks?status=overdue' },
    missing_checkout: { key: 'missing_checkout', title: 'Missing checkout', chipLabel: 'Missing checkout', activeText: 'Fix attendance', href: '/employee/attendance' },
    active_timer: { key: 'active_timer', title: 'Active timer running', chipLabel: 'Active timer', activeText: 'Timer active', href: '/employee/time-logs' },
    task_deadline_near: { key: 'task_deadline_near', title: 'Task deadline near', chipLabel: 'Deadline near', activeText: 'Due soon', href: '/employee/tasks' },
    important_announcement: { key: 'important_announcement', title: 'Important announcement', chipLabel: 'Announcement', activeText: 'Read update', href: '/employee/dashboard' },
  },
  intern: {
    my_eod_pending: { key: 'my_eod_pending', title: 'My EOD pending', chipLabel: 'EOD pending', activeText: 'Submit today', href: '/employee/eod' },
    my_overdue_tasks: { key: 'my_overdue_tasks', title: 'My overdue tasks', chipLabel: 'Overdue tasks', activeText: 'Needs action', href: '/employee/tasks?status=overdue' },
    missing_checkout: { key: 'missing_checkout', title: 'Missing checkout', chipLabel: 'Missing checkout', activeText: 'Fix attendance', href: '/employee/attendance' },
    active_timer: { key: 'active_timer', title: 'Active timer running', chipLabel: 'Active timer', activeText: 'Timer active', href: '/employee/time-logs' },
    task_deadline_near: { key: 'task_deadline_near', title: 'Task deadline near', chipLabel: 'Deadline near', activeText: 'Due soon', href: '/employee/tasks' },
  },
  hr: {
    attendance_exceptions: { key: 'attendance_exceptions', title: 'Attendance exceptions', chipLabel: 'Attendance exceptions', activeText: 'Needs review', href: '/hr/attendance-exceptions' },
    pending_leave_requests: { key: 'pending_leave_requests', title: 'Pending leave requests', chipLabel: 'Leave approvals', activeText: 'Awaiting decision', href: '/hr/approvals?type=leave' },
    pending_wfh_requests: { key: 'pending_wfh_requests', title: 'Pending WFH requests', chipLabel: 'WFH approvals', activeText: 'Awaiting decision', href: '/hr/approvals?type=wfh' },
    missing_checkout: { key: 'missing_checkout', title: 'Missing checkouts', chipLabel: 'Missing checkouts', activeText: 'Attendance issue', href: '/hr/attendance-exceptions?type=missing_checkout' },
    absent_today: { key: 'absent_today', title: 'Absent today', chipLabel: 'Absent today', activeText: 'Attendance issue', href: '/hr/attendance-exceptions?type=absent' },
    pending_approvals: { key: 'pending_approvals', title: 'Pending approvals', chipLabel: 'Pending approvals', activeText: 'Awaiting decision', href: '/hr/approvals' },
  },
};

const apiKeyAliases: Record<string, Partial<Record<DashboardRole, DashboardCardKey>> & { default: DashboardCardKey }> = {
  attendance_exceptions: { default: 'attendance_exceptions', manager: 'team_attendance_exceptions' },
  pending_eods: { default: 'eod_pending_review', manager: 'pending_eod_reviews' },
  long_timers: { default: 'long_running_timers' },
  overdue_tasks: { default: 'overdue_tasks' },
  team_overdue: { default: 'team_overdue_tasks' },
  team_blockers: { default: 'team_blockers' },
  absent_today: { default: 'absent_today', manager: 'direct_reports_absent' },
  missing_checkouts: { default: 'missing_checkout' },
  my_overdue: { default: 'my_overdue_tasks' },
  my_active_timer: { default: 'active_timer' },
  my_eod: { default: 'my_eod_pending' },
  announcement: { default: 'important_announcement' },
  holiday: { default: 'upcoming_holiday' },
};

export function normalizeDashboardCardKey(key: string, role: DashboardRole): DashboardCardKey {
  const alias = apiKeyAliases[key];
  return alias?.[role] ?? alias?.default ?? (key as DashboardCardKey);
}

export function uniqueCards<T extends string | { key: string }>(cards: T[]): T[] {
  const seen = new Set<string>();
  return cards.filter((card) => {
    const key = typeof card === 'string' ? card : card.key;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getDashboardRoleConfig(role: DashboardRole): DashboardRoleCardConfig {
  const config = dashboardCardConfig[role];
  return {
    actionCards: uniqueCards(config.actionCards),
    overviewCards: uniqueCards(config.overviewCards),
  };
}

export function hasOverviewCard(role: DashboardRole, key: DashboardCardKey): boolean {
  return getDashboardRoleConfig(role).overviewCards.includes(key);
}

export function warnIfDuplicateDashboardCards(
  role: DashboardRole,
  actionCards: DashboardCardKey[],
  overviewCards: DashboardCardKey[],
): void {
  const warn = (message: string) => console.warn(`[dashboard-card-config:${role}] ${message}`);
  const reportDuplicates = (label: string, cards: DashboardCardKey[]) => {
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    cards.forEach((card) => {
      if (seen.has(card)) duplicates.add(card);
      seen.add(card);
    });
    if (duplicates.size) warn(`${label} duplicates: ${Array.from(duplicates).join(', ')}`);
  };

  reportDuplicates('actionCards', actionCards);
  reportDuplicates('overviewCards', overviewCards);

  const actionSet = new Set(actionCards);
  const overlap = overviewCards.filter((card) => actionSet.has(card));
  if (overlap.length) warn(`action/overview overlap: ${overlap.join(', ')}`);
}

if (process.env.NODE_ENV !== 'production') {
  (Object.keys(dashboardCardConfig) as DashboardRole[]).forEach((role) => {
    const config = dashboardCardConfig[role];
    warnIfDuplicateDashboardCards(role, config.actionCards, config.overviewCards);
  });
}
