import type { Task } from '@/lib/api/tasks';
import type { TaskTimerSession } from '@/lib/api/timeLogs';
import { normalizeRole } from '@/lib/task-routes';

export type CompleteTaskButtonState =
  | 'hidden'
  | 'complete'
  | 'stop_and_complete'
  | 'completed';

const SELF_COMPLETE_ROLES = new Set(['employee', 'intern', 'junior_employee']);

export function isInternRole(role?: string | null): boolean {
  return normalizeRole(role) === 'intern';
}

export function canSelfCompleteTasks(role?: string | null): boolean {
  return SELF_COMPLETE_ROLES.has(normalizeRole(role));
}

export function isTaskCompletableByUser(
  task: Pick<Task, 'assigned_to' | 'created_by'>,
  currentUserId?: string | null,
): boolean {
  if (!currentUserId) return false;
  return task.assigned_to === currentUserId || task.created_by === currentUserId;
}

export function canShowTaskCompleteButton(params: {
  role?: string | null;
  task: Pick<Task, 'status' | 'assigned_to' | 'created_by' | 'can_complete'>;
  currentUserId?: string | null;
  activeTimer?: Pick<TaskTimerSession, 'task_id' | 'status'> | null;
}): boolean {
  const state = getCompleteTaskButtonState(params);
  return state !== 'hidden';
}

export function getCompleteTaskButtonState(params: {
  role?: string | null;
  task: Pick<Task, 'status' | 'assigned_to' | 'created_by' | 'can_complete'>;
  currentUserId?: string | null;
  activeTimer?: Pick<TaskTimerSession, 'task_id' | 'status'> | null;
}): CompleteTaskButtonState {
  const { role, task, currentUserId, activeTimer } = params;

  if (task.can_complete === false) {
    return 'hidden';
  }

  const eligibleByRole =
    task.can_complete === true ||
    (canSelfCompleteTasks(role) && isTaskCompletableByUser(task, currentUserId));

  if (!eligibleByRole) {
    return 'hidden';
  }

  if (task.status === 'completed' || task.status === 'reviewed' || task.status === 'archived') {
    return 'completed';
  }

  if (activeTimer?.task_id === task.id && activeTimer.status !== 'completed') {
    return 'stop_and_complete';
  }

  return 'complete';
}

export function getCompleteTaskButtonLabel(state: CompleteTaskButtonState): string {
  switch (state) {
    case 'complete':
      return 'Mark Complete';
    case 'stop_and_complete':
      return 'Stop & Complete';
    case 'completed':
      return 'Completed';
    default:
      return '';
  }
}

export function dispatchTaskAndEodRefresh() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('pims-tasks-updated'));
  window.dispatchEvent(new CustomEvent('pims-eod-refresh'));
}
