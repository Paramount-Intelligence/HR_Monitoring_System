import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { getAssigneeLabel, getProjectLabel } from '@/lib/display-labels';

export type TaskStatusFilter =
  | 'all'
  | 'created'
  | 'approved'
  | 'in_progress'
  | 'blocked'
  | 'completed'
  | 'reviewed'
  | 'reopened'
  | 'archived';

export type TaskPriorityFilter = 'all' | 'low' | 'medium' | 'high' | 'critical';

export type TaskDeadlineFilter =
  | 'all'
  | 'overdue'
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'no_deadline';

export type TaskSortOption =
  | 'latest'
  | 'oldest'
  | 'deadline_soonest'
  | 'deadline_latest'
  | 'priority_high'
  | 'priority_low';

export interface TaskFilterState {
  assignee: string;
  status: TaskStatusFilter;
  priority: TaskPriorityFilter;
  deadline: TaskDeadlineFilter;
  sort: TaskSortOption;
  search: string;
}

export const DEFAULT_TASK_FILTERS: TaskFilterState = {
  assignee: 'all',
  status: 'in_progress',
  priority: 'all',
  deadline: 'all',
  sort: 'latest',
  search: '',
};

export interface TaskFilterItem {
  id: string;
  title: string;
  description?: string | null;
  project_title?: string | null;
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  assignee_name?: string | null;
  status: string;
  priority: string;
  due_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

const PRIORITY_ORDER: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function parseDueDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  try {
    return parseISO(value.includes('T') ? value : `${value}T00:00:00`);
  } catch {
    return null;
  }
}

function getSortTimestamp(task: TaskFilterItem): number {
  const candidates = [task.updated_at, task.created_at, task.due_date];
  for (const value of candidates) {
    if (!value) continue;
    const ms = new Date(value).getTime();
    if (Number.isFinite(ms)) return ms;
  }
  return 0;
}

function matchesDeadline(task: TaskFilterItem, deadline: TaskDeadlineFilter, now = new Date()): boolean {
  if (deadline === 'all') return true;

  const due = parseDueDate(task.due_date);
  if (deadline === 'no_deadline') return !due;

  if (!due) return false;

  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);

  if (deadline === 'overdue') {
    return due < dayStart && task.status !== 'completed' && task.status !== 'archived';
  }
  if (deadline === 'today') {
    return isWithinInterval(due, { start: dayStart, end: dayEnd });
  }
  if (deadline === 'this_week') {
    return isWithinInterval(due, {
      start: startOfWeek(now, { weekStartsOn: 1 }),
      end: endOfWeek(now, { weekStartsOn: 1 }),
    });
  }
  if (deadline === 'this_month') {
    return isWithinInterval(due, { start: startOfMonth(now), end: endOfMonth(now) });
  }

  return true;
}

export function filterTasks(
  tasks: TaskFilterItem[],
  filters: TaskFilterState,
  options?: {
    currentUserId?: string;
    usersMap?: Map<string, { full_name?: string | null; name?: string | null; email?: string | null }>;
  }
): TaskFilterItem[] {
  const query = filters.search.trim().toLowerCase();

  return tasks.filter((task) => {
    if (filters.status !== 'all' && task.status !== filters.status) return false;
    if (filters.priority !== 'all' && task.priority !== filters.priority) return false;
    if (!matchesDeadline(task, filters.deadline)) return false;

    if (filters.assignee === 'you') {
      if (!options?.currentUserId || task.assigned_to !== options.currentUserId) return false;
    } else if (filters.assignee === 'unassigned') {
      if (task.assigned_to) return false;
    } else if (filters.assignee !== 'all') {
      if (task.assigned_to !== filters.assignee) return false;
    }

    if (!query) return true;

    const assigneeLabel = getAssigneeLabel(task, options?.usersMap, options?.currentUserId).toLowerCase();
    const projectLabel = getProjectLabel({ title: task.project_title }).toLowerCase();

    return (
      task.title.toLowerCase().includes(query) ||
      (task.description ?? '').toLowerCase().includes(query) ||
      projectLabel.includes(query) ||
      assigneeLabel.includes(query) ||
      task.status.replace(/_/g, ' ').toLowerCase().includes(query) ||
      task.priority.toLowerCase().includes(query)
    );
  });
}

export function sortTasks(tasks: TaskFilterItem[], sort: TaskSortOption): TaskFilterItem[] {
  const sorted = [...tasks];

  sorted.sort((a, b) => {
    if (sort === 'latest') return getSortTimestamp(b) - getSortTimestamp(a);
    if (sort === 'oldest') return getSortTimestamp(a) - getSortTimestamp(b);

    const aDue = parseDueDate(a.due_date)?.getTime() ?? Number.POSITIVE_INFINITY;
    const bDue = parseDueDate(b.due_date)?.getTime() ?? Number.POSITIVE_INFINITY;

    if (sort === 'deadline_soonest') return aDue - bDue;
    if (sort === 'deadline_latest') return bDue - aDue;

    const aPriority = PRIORITY_ORDER[a.priority] ?? 0;
    const bPriority = PRIORITY_ORDER[b.priority] ?? 0;

    if (sort === 'priority_high') return bPriority - aPriority;
    if (sort === 'priority_low') return aPriority - bPriority;

    return 0;
  });

  return sorted;
}

export function applyTaskFilters(
  tasks: TaskFilterItem[],
  filters: TaskFilterState,
  options?: {
    currentUserId?: string;
    usersMap?: Map<string, { full_name?: string | null; name?: string | null; email?: string | null }>;
  }
): TaskFilterItem[] {
  return sortTasks(filterTasks(tasks, filters, options), filters.sort);
}

export function hasActiveTaskFilters(filters: TaskFilterState): boolean {
  return (
    filters.assignee !== DEFAULT_TASK_FILTERS.assignee ||
    filters.status !== DEFAULT_TASK_FILTERS.status ||
    filters.priority !== DEFAULT_TASK_FILTERS.priority ||
    filters.deadline !== DEFAULT_TASK_FILTERS.deadline ||
    filters.sort !== DEFAULT_TASK_FILTERS.sort ||
    filters.search.trim().length > 0
  );
}
