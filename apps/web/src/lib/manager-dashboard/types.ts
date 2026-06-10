import { ProjectsTasksAnalyticsData } from '@/lib/admin-dashboard/types';

export type ManagerDashboardTabId =
  | 'overview'
  | 'team'
  | 'approvals'
  | 'projects'
  | 'eod';

export interface ManagerOverviewData {
  kpis: Record<string, number>;
  attendance_trend: { date: string; checked_in: number; late: number; absent: number }[];
  team_health: { score: number; label: string; blocked_tasks: number; overdue_tasks: number; active_members: number };
  pending_actions: { title: string; description: string; route: string; priority: string }[];
  recent_activity: { title: string; description: string; created_at: string }[];
  members_needing_attention: { employee_name: string; department_name: string; status: string; details: string }[];
  upcoming_meetings: Record<string, unknown>[];
}

export interface ManagerTeamAnalyticsData {
  summary: Record<string, number>;
  attendance_by_member: { label: string; count: number }[];
  workload_distribution: { label: string; count: number }[];
  task_completion_by_member: { label: string; count: number }[];
  logged_hours_trend: { date: string; checked_in: number; late: number; absent: number }[];
  employee_roster: Record<string, unknown>[];
  employee_performance: Record<string, unknown>[];
}

export interface ManagerApprovalsAnalyticsData {
  summary: Record<string, number>;
  pending_leaves: Record<string, unknown>[];
  pending_corrections: Record<string, unknown>[];
}

export interface ManagerEodAnalyticsData {
  summary: Record<string, number>;
  reports: Record<string, unknown>[];
  productivity_trend: { label: string; count: number }[];
  blocker_trend: { label: string; count: number }[];
}

export type ManagerProjectsTasksData = ProjectsTasksAnalyticsData;
