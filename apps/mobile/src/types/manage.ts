export interface AdminDashboardSummary {
  total_users: number;
  active_users: number;
  checked_in_today: number;
  wfh_today: number;
  office_today: number;
  pending_approvals_count: number;
  open_alerts_count: number;
  overdue_tasks_count: number;
  active_projects?: number;
  open_alerts?: number;
}

export interface TeamMemberAttendanceToday {
  user_id: string;
  full_name: string;
  checked_in: boolean;
  work_mode: 'office' | 'wfh' | null;
  check_in_at: string | null;
}

export interface ManagerDashboardSummary {
  team_attendance_today: TeamMemberAttendanceToday[];
  pending_approvals_count: number;
  overdue_tasks_count: number;
  blocked_tasks_count: number;
  team_members_active?: number;
  pending_approvals?: number;
  overdue_tasks?: number;
  blocked_tasks?: number;
}

export interface ManagerOverviewKPIs {
  team_members: number;
  present_today: number;
  pending_approvals: number;
  active_tasks: number;
  overdue_tasks: number;
  projects_in_progress: number;
  eod_reports_pending: number;
  team_workload: number;
}

export interface ManagerOverviewDashboard {
  kpis: ManagerOverviewKPIs;
  pending_actions: { title: string; route?: string; priority?: string }[];
}

export interface ManageSummary {
  role: string;
  title: string;
  activeEmployees?: number;
  presentToday?: number;
  pendingApprovals?: number;
  teamMembers?: number;
  teamPresent?: number;
  teamOnLeave?: number;
  openAlerts?: number;
}

export interface UsersListParams {
  role?: string;
  manager_id?: string;
  status?: string;
  department?: string;
}

export interface TeamAttendanceParams {
  date_from?: string;
  date_to?: string;
}
