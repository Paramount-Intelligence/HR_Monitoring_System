import type { TaskApiRecord, TaskStatus, TaskViewModel } from '../types/task';
import type { User } from '../types/user';
import { normalizeRole } from './role';
import type { StatusBadgeVariant } from '../components/ui/StatusBadge';

export function getTaskStatusLabel(status: TaskStatus | string): string {
  switch (status) {
    case 'created':
      return 'Not started';
    case 'approved':
      return 'Pending';
    case 'in_progress':
      return 'In progress';
    case 'blocked':
      return 'Blocked';
    case 'completed':
      return 'Completed';
    case 'reviewed':
      return 'In review';
    case 'reopened':
      return 'Reopened';
    default:
      return String(status).replace(/_/g, ' ');
  }
}

export function getTaskStatusVariant(status: TaskStatus | string): StatusBadgeVariant {
  switch (status) {
    case 'completed':
    case 'reviewed':
      return 'success';
    case 'in_progress':
      return 'info';
    case 'blocked':
    case 'reopened':
      return 'warning';
    case 'created':
    case 'approved':
      return 'neutral';
    default:
      return 'neutral';
  }
}

export function getTaskAccentColor(task: { status: TaskStatus | string; isOverdue?: boolean }, isOverdue?: boolean): string {
  const overdue = isOverdue ?? ('isOverdue' in task ? task.isOverdue : false);
  if (overdue) return '#EF4444';
  const status = task.status;
  if (status === 'completed' || status === 'reviewed') return '#10B981';
  if (status === 'blocked') return '#F59E0B';
  if (status === 'in_progress') return '#3B82F6';
  return '#0037b0';
}

export function isTaskOverdue(task: TaskApiRecord): boolean {
  if (!task.due_date) return false;
  if (task.status === 'completed' || task.status === 'reviewed') return false;
  const due = new Date(task.due_date);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

export function deriveTaskProgress(task: TaskApiRecord): number {
  if (task.status === 'completed' || task.status === 'reviewed') return 100;
  if (task.actual_duration_minutes != null && task.expected_duration_minutes != null && task.expected_duration_minutes > 0) {
    return Math.min(100, Math.round((task.actual_duration_minutes / task.expected_duration_minutes) * 100));
  }
  switch (task.status) {
    case 'in_progress':
      return 50;
    case 'approved':
      return 15;
    case 'blocked':
    case 'reopened':
      return 25;
    default:
      return 0;
  }
}

export function canUserCreateTask(user: User | null | undefined): boolean {
  const role = normalizeRole(user?.role);
  return role === 'admin' || role === 'manager' || role === 'team_lead';
}

export function canViewTeamTasks(user: User | null | undefined): boolean {
  const role = normalizeRole(user?.role);
  return role === 'admin' || role === 'manager' || role === 'team_lead' || role === 'hr_operations';
}

export function buildTaskPermissions(task: TaskApiRecord, user: User | null | undefined) {
  const role = normalizeRole(user?.role);
  const isAssignee = user?.id === task.assigned_to;
  const isManager = role === 'manager';
  const isAdmin = role === 'admin';
  const isTeamLead = role === 'team_lead';

  return {
    canEdit: isAdmin || isManager || isTeamLead,
    canUpdateStatus: isAssignee || isAdmin || isManager || isTeamLead,
    canComment: true,
    canReassign: isAdmin || isManager || isTeamLead,
  };
}

export function mapTaskToViewModel(
  task: TaskApiRecord,
  user?: User | null,
  extras?: { commentsCount?: number; subtasksCount?: number; completedSubtasksCount?: number; createdByName?: string | null }
): TaskViewModel {
  const permissions = buildTaskPermissions(task, user);
  const overdue = isTaskOverdue(task);

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    projectId: task.project_id,
    projectName: task.project_title ?? 'Project',
    status: task.status,
    priority: task.priority,
    progress: deriveTaskProgress(task),
    dueDate: task.due_date,
    completedAt: task.completed_at,
    assignedToId: task.assigned_to,
    assigneeName: task.assigned_to_name ?? 'Assignee',
    createdById: task.created_by,
    assignedByName: extras?.createdByName ?? 'Manager',
    commentsCount: extras?.commentsCount ?? 0,
    subtasksCount: extras?.subtasksCount ?? 0,
    completedSubtasksCount: extras?.completedSubtasksCount ?? 0,
    isOverdue: overdue,
    ...permissions,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
  };
}

export type TaskFilterId =
  | 'all'
  | 'today'
  | 'pending'
  | 'not_started'
  | 'in_progress'
  | 'in_review'
  | 'completed'
  | 'overdue'
  | 'blocked'
  | 'high_priority';

export function matchesTaskFilter(task: TaskViewModel, filter: TaskFilterId): boolean {
  switch (filter) {
    case 'today': {
      if (!task.dueDate) return false;
      return new Date(task.dueDate).toDateString() === new Date().toDateString();
    }
    case 'pending':
      return task.status === 'approved' || task.status === 'created';
    case 'not_started':
      return task.status === 'created';
    case 'in_progress':
      return task.status === 'in_progress';
    case 'in_review':
      return task.status === 'reviewed';
    case 'completed':
      return task.status === 'completed';
    case 'overdue':
      return task.isOverdue;
    case 'blocked':
      return task.status === 'blocked';
    case 'high_priority':
      return task.priority === 'high' || task.priority === 'critical';
    default:
      return true;
  }
}

export function matchesTaskSearch(task: TaskViewModel, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    task.title.toLowerCase().includes(q) ||
    task.projectName.toLowerCase().includes(q) ||
    task.assigneeName.toLowerCase().includes(q)
  );
}

export interface TaskActionOption {
  id: string;
  label: string;
  status: TaskStatus;
  needsBlockedReason?: boolean;
}

export function getAvailableTaskActions(
  status: TaskStatus,
  canUpdateStatus: boolean
): TaskActionOption[] {
  if (!canUpdateStatus) return [];

  const actions: TaskActionOption[] = [];

  if (status === 'created' || status === 'approved' || status === 'reopened') {
    actions.push({ id: 'start', label: 'Start task', status: 'in_progress' });
  }

  if (status === 'in_progress') {
    actions.push({ id: 'review', label: 'Send for review', status: 'reviewed' });
    actions.push({ id: 'complete', label: 'Mark completed', status: 'completed' });
    actions.push({ id: 'block', label: 'Mark blocked', status: 'blocked', needsBlockedReason: true });
  }

  if (status === 'blocked') {
    actions.push({ id: 'resume', label: 'Resume work', status: 'in_progress' });
  }

  if (status === 'reviewed') {
    actions.push({ id: 'complete', label: 'Mark completed', status: 'completed' });
    actions.push({ id: 'reopen', label: 'Reopen task', status: 'reopened' });
  }

  if (status === 'completed') {
    actions.push({ id: 'reopen', label: 'Reopen task', status: 'reopened' });
  }

  return actions;
}
