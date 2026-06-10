export interface AdminDashboardTabState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface UsersAnalyticsData {
  summary: Record<string, number>;
  role_distribution: { label: string; count: number }[];
  department_distribution: { label: string; count: number }[];
  attendance_rate_by_department: { label: string; count: number }[];
  employee_activity_trend: { date: string; checked_in: number; late: number; absent: number }[];
  employee_roster: Record<string, unknown>[];
  employee_performance: Record<string, unknown>[];
  recent_user_activity: { title: string; description: string; created_at: string }[];
}

export interface CommunicationAnalyticsData {
  summary: Record<string, number>;
  messages_by_day: { date: string; count: number }[];
  meetings_by_week: { label: string; count: number }[];
  support_tickets_by_status: { label: string; count: number }[];
  recent_conversations: Record<string, unknown>[];
  upcoming_meetings: Record<string, unknown>[];
  recent_announcements: { title: string; description: string; created_at: string }[];
  support_tickets: Record<string, unknown>[];
}

export interface ProjectsTasksAnalyticsData {
  summary: Record<string, number>;
  task_status_distribution: { label: string; count: number }[];
  task_priority_distribution: { label: string; count: number }[];
  project_progress: { label: string; count: number }[];
  tasks_by_department: { label: string; count: number }[];
  projects: Record<string, unknown>[];
  tasks: Record<string, unknown>[];
}
