import type { Task } from '@/lib/api/tasks';
import type { TaskTimerSession } from '@/lib/api/timeLogs';
import type { TaskCompletionRequestSummary } from '@/lib/api/taskCompletionRequests';
import { normalizeRole } from '@/lib/task-routes';

export type CompleteTaskButtonState =
  | 'hidden'
  | 'complete'
  | 'timer_active'
  | 'pending'
  | 'rejected'
  | 'completed';

export function isInternRole(role?: string | null): boolean {
  return normalizeRole(role) === 'intern';
}

export function getCompleteTaskButtonState(params: {
  role?: string | null;
  task: Pick<Task, 'status' | 'assigned_to'>;
  currentUserId?: string | null;
  activeTimer?: Pick<TaskTimerSession, 'task_id' | 'status'> | null;
  pendingCompletionRequest?: TaskCompletionRequestSummary | null;
}): CompleteTaskButtonState {
  const { role, task, currentUserId, activeTimer, pendingCompletionRequest } = params;

  if (!isInternRole(role) || !currentUserId || task.assigned_to !== currentUserId) {
    return 'hidden';
  }

  if (task.status === 'completed' || task.status === 'reviewed' || task.status === 'archived') {
    return 'completed';
  }

  if (pendingCompletionRequest?.status === 'pending') {
    return 'pending';
  }

  if (pendingCompletionRequest?.status === 'rejected') {
    if (activeTimer?.task_id === task.id && activeTimer.status !== 'completed') {
      return 'timer_active';
    }
    return 'rejected';
  }

  if (activeTimer?.task_id === task.id && activeTimer.status !== 'completed') {
    return 'timer_active';
  }

  return 'complete';
}

export function getCompleteTaskButtonLabel(state: CompleteTaskButtonState): string {
  switch (state) {
    case 'complete':
      return 'Complete Task';
    case 'timer_active':
      return 'Stop the timer before requesting completion';
    case 'pending':
      return 'Completion requested';
    case 'rejected':
      return 'Request rejected — Complete Task';
    case 'completed':
      return 'Completed';
    default:
      return '';
  }
}
