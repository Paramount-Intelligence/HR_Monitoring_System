import { formatSafeDurationFromSeconds } from '@/lib/utils';

export interface TimerTaskLike {
  id?: string;
  assigned_to?: string;
  status?: string | null;
}

export interface TimeLogDurationLike {
  duration_minutes?: number | null;
  started_at?: string;
  ended_at?: string | null;
  status?: string;
}

const NON_TRACKABLE_STATUSES = new Set(['completed', 'archived', 'blocked']);

export function canTrackTaskForTimer(task: TimerTaskLike, currentUserId: string | undefined): boolean {
  if (!currentUserId || !task.assigned_to) return false;
  if (task.assigned_to !== currentUserId) return false;
  if (task.status && NON_TRACKABLE_STATUSES.has(task.status)) return false;
  return true;
}

export function getStartTimerDisabledReason(params: {
  selectedTaskId: string;
  hasActiveTimer: boolean;
  isSubmitting: boolean;
  isLoading: boolean;
  selectedTask: TimerTaskLike | null | undefined;
  currentUserId?: string;
}): string | null {
  if (params.isSubmitting) return 'Saving...';
  if (params.isLoading) return 'Loading tasks...';
  if (params.hasActiveTimer) return 'Another timer is already active. Stop it first.';
  if (!params.selectedTaskId) return 'Select a task to start tracking.';
  if (!params.selectedTask) return 'Selected task is no longer available.';
  if (!params.currentUserId) return null;

  if (!canTrackTaskForTimer(params.selectedTask, params.currentUserId)) {
    if (params.selectedTask.status === 'completed' || params.selectedTask.status === 'archived') {
      return 'Task is completed or archived.';
    }
    if (params.selectedTask.status === 'blocked') {
      return 'Task is blocked.';
    }
    return 'You can only start timers for tasks assigned to you.';
  }

  return null;
}

export function formatTimeLogDuration(log: TimeLogDurationLike): string {
  if (log.status === 'active') return '—';

  const minutes = Number(log.duration_minutes);
  if (Number.isFinite(minutes) && minutes > 0) {
    return formatSafeDurationFromSeconds(Math.round(minutes * 60));
  }

  if (log.started_at && log.ended_at) {
    const start = new Date(log.started_at).getTime();
    const end = new Date(log.ended_at).getTime();
    if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
      const seconds = Math.floor((end - start) / 1000);
      return formatSafeDurationFromSeconds(seconds);
    }
  }

  if (Number.isFinite(minutes) && minutes === 0) {
    return '< 1m';
  }

  return '—';
}
