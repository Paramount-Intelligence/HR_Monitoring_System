export interface ReportSummary {
  user_id: string;
  user_name: string;
  start_date: string;
  end_date: string;
  total_hours: number;
  late_logins: number;
  early_logouts: number;
  absences: number;
  wfh_days: number;
}

export interface ReportQueryParams {
  start_date: string;
  end_date: string;
}

export interface DistributionItem {
  label: string;
  count: number;
}

export interface AdminAnalyticsDeptComparison {
  department_name: string;
  attendance_rate: number;
  present_count: number;
  total_count: number;
}

export interface AdminAnalyticsAttendanceTrend {
  date: string;
  present: number;
  absent: number;
  wfh: number;
  late: number;
}

export interface AdminAnalyticsDashboard {
  kpis: {
    total_employees: number;
    checked_in_today: number;
    late_today: number;
    wfh_today: number;
    pending_approvals: number;
    attendance_rate: number;
  };
  attendance_trend: AdminAnalyticsAttendanceTrend[];
  department_comparison: AdminAnalyticsDeptComparison[];
  people_exceptions: {
    employee_name: string;
    department_name: string;
    status: string;
    details: string;
  }[];
}

export interface ManagerTeamAnalytics {
  summary: {
    total_members: number;
    checked_in: number;
    late_today: number;
    on_leave: number;
    wfh_today: number;
    high_workload_members: number;
  };
  attendance_by_member: DistributionItem[];
  workload_distribution: DistributionItem[];
  task_completion_by_member: DistributionItem[];
  logged_hours_trend: AdminAnalyticsAttendanceTrend[];
  employee_performance: {
    id: string;
    full_name: string;
    department?: string | null;
    attendance_rate: number;
    task_completion_rate: number;
    average_logged_hours: number;
    late_count: number;
    productivity_index?: number | null;
  }[];
}

export interface ManagerApprovalsAnalytics {
  summary: {
    pending_leave_requests: number;
    pending_wfh_requests: number;
    attendance_corrections: number;
    approved_this_week: number;
    rejected_this_week: number;
  };
}

export interface AnalyticsPerformer {
  user_id: string;
  full_name: string;
  score: number;
  completed_tasks: number;
  attendance_consistency: number;
}

export interface AnalyticsWorkload {
  user_id: string;
  full_name: string;
  active_tasks: number;
  overloaded: boolean;
}
