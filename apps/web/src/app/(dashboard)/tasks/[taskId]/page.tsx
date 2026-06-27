'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Briefcase, Calendar, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/AuthContext';
import { tasksApi, Task } from '@/lib/api/tasks';
import { timeLogsApi, TaskTimerSession } from '@/lib/api/timeLogs';
import { AttendanceSession } from '@/lib/api/attendance';
import apiClient, { getErrorMessage } from '@/lib/api/client';
import { getAssigneeLabel } from '@/lib/display-labels';
import {
  getTasksListHref,
  getTimeLogsHref,
} from '@/lib/task-routes';
import {
  canTrackTaskForTimer,
} from '@/lib/time-logs/timer-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { TaskTimer } from '@/components/tasks/TaskTimer';
import { TaskCompleteRequestButton } from '@/components/tasks/TaskCompleteRequestButton';

export default function TaskDetailPage() {
  const params = useParams<{ taskId: string }>();
  const taskId = params?.taskId ?? '';
  const router = useRouter();
  const { user } = useAuth();

  const [task, setTask] = useState<Task | null>(null);
  const [activeTimer, setActiveTimer] = useState<TaskTimerSession | null>(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadTask = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    setForbidden(false);
    setNotFound(false);
    try {
      const [taskData, timerData, attendanceData] = await Promise.all([
        tasksApi.getTask(taskId),
        timeLogsApi.getActiveTimer().catch(() => null),
        apiClient.get<AttendanceSession | null>('/attendance/active').then((res) => res.data).catch(() => null),
      ]);
      setTask(taskData);
      setActiveTimer(timerData);
      setIsCheckedIn(Boolean(attendanceData && attendanceData.session_status === 'active'));
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 403) {
        setForbidden(true);
      } else if (status === 404) {
        setNotFound(true);
      } else {
        toast.error(getErrorMessage(error));
      }
      setTask(null);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    void loadTask();
  }, [loadTask]);

  const canTrack = task && user?.id ? canTrackTaskForTimer(task, user.id) : false;
  const isActiveOnThisTask = activeTimer?.task_id === taskId;
  const listHref = getTasksListHref({
    role: user?.role,
    currentUserId: user?.id,
    assigneeId: task?.assigned_to,
  });
  const timeLogsHref = getTimeLogsHref(user?.role);

  const getPauseLabel = (reason: string | null) => {
    if (reason === 'attendance_checkout') return 'Paused after checkout';
    if (reason === 'break_started') return 'Paused for break';
    return 'Paused';
  };

  const handlePause = async () => {
    if (!task) return;
    setActionLoading(true);
    try {
      await timeLogsApi.pauseTimer(task.id);
      toast.success('Timer paused');
      await loadTask();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    if (!task) return;
    setActionLoading(true);
    try {
      await timeLogsApi.resumeTimer(task.id);
      toast.success('Timer resumed');
      await loadTask();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async () => {
    if (!task) return;
    setActionLoading(true);
    try {
      await timeLogsApi.stopTimer(task.id);
      toast.success('Timer stopped');
      await loadTask();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-3 text-[var(--text-secondary)]">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm font-medium">Loading task...</span>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-8">
        <Card className="border-[var(--border-default)] bg-[var(--bg-elevated)]">
          <CardHeader>
            <CardTitle className="text-lg">Task unavailable</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-[var(--text-secondary)]">
            <p>You don&apos;t have permission to view this task.</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => router.back()}>
                Go back
              </Button>
              <Button asChild size="sm" variant="ghost">
                <Link href={listHref}>View my tasks</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (notFound || !task) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-8">
        <Card className="border-[var(--border-default)] bg-[var(--bg-elevated)]">
          <CardHeader>
            <CardTitle className="text-lg">Task not found</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="outline">
              <Link href={listHref}>Back to tasks</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const assigneeLabel = getAssigneeLabel(task, undefined, user?.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="rounded-lg -ml-2">
          <Link href={listHref}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to tasks
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="rounded-lg">
          <Link href={timeLogsHref}>
            <Clock className="mr-1.5 h-4 w-4" />
            Time logs
          </Link>
        </Button>
      </div>

      <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--shadow-soft)]">
        <CardHeader className="space-y-2 border-b border-[var(--border-subtle)]">
          <CardTitle className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            {task.title}
          </CardTitle>
          {task.description && (
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{task.description}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Project</span>
              <p className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                <Briefcase className="h-4 w-4 text-[var(--accent-primary)]" />
                {task.project_title || 'General / Internal'}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Assigned to</span>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{assigneeLabel}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Status</span>
              <StatusBadge status={task.status} />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Priority</span>
              <StatusBadge status={task.priority} />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Due date</span>
              <p className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
                {task.due_date ? format(parseISO(task.due_date), 'MMM d, yyyy') : 'No deadline'}
              </p>
            </div>
            {task.completed_at && (
              <div className="space-y-1 sm:col-span-2">
                <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Completed</span>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {format(parseISO(task.completed_at), 'MMM d, yyyy h:mm a')}
                  {task.completed_by_name ? ` · ${task.completed_by_name}` : ''}
                </p>
              </div>
            )}
          </div>

          {isActiveOnThisTask && activeTimer && (
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-subtle)]/60 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    {activeTimer.status === 'running' ? 'Timer running' : getPauseLabel(activeTimer.pause_reason)}
                  </p>
                  <TaskTimer
                    startedAt={activeTimer.started_at}
                    lastResumedAt={activeTimer.last_resumed_at}
                    accumulatedSeconds={activeTimer.accumulated_seconds}
                    status={activeTimer.status}
                    className="text-lg font-mono font-bold text-[var(--accent-primary)]"
                  />
                </div>
                {canTrack && (
                  <div className="flex flex-wrap gap-2">
                    {activeTimer.status === 'running' ? (
                      <Button size="sm" variant="outline" onClick={handlePause} disabled={actionLoading}>
                        Pause
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={handleResume}
                        disabled={actionLoading || !isCheckedIn}
                      >
                        Resume
                      </Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={handleStop} disabled={actionLoading}>
                      Stop
                    </Button>
                  </div>
                )}
              </div>
              {!isCheckedIn && activeTimer.status === 'paused' && (
                <p className="text-xs text-amber-600">Check in to resume the timer.</p>
              )}
            </div>
          )}

          {canTrack && !isActiveOnThisTask && (
            <p className="text-sm text-[var(--text-secondary)]">
              Start or manage this timer from{' '}
              <Link href={timeLogsHref} className="font-semibold text-[var(--accent-primary)] hover:underline">
                Time Logs
              </Link>
              .
            </p>
          )}

          <TaskCompleteRequestButton
            task={task}
            role={user?.role}
            currentUserId={user?.id}
            activeTimer={activeTimer}
            onSuccess={loadTask}
          />
        </CardContent>
      </Card>
    </div>
  );
}
