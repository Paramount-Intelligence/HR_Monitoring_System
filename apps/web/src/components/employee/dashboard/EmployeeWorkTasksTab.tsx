'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Task } from '@/lib/api/tasks';
import { TaskTimerSession } from '@/lib/api/timeLogs';
import { DashboardSummary } from '@/lib/api/dashboard';
import { messagesApi } from '@/lib/api/messages';
import { AdminMetricCard } from '@/components/admin/dashboard/AdminMetricCard';
import { AdminDataTable } from '@/components/admin/dashboard/AdminDataTable';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Play, StopCircle, Clock, MessageSquare, Briefcase, Loader2 } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/api/client';
import { cn } from '@/lib/utils';

function formatDueDate(due: string | null): string {
  if (!due) return '—';
  const d = parseISO(due);
  if (!isValid(d)) return '—';
  return format(d, 'MMM d, yyyy');
}

function isOverdue(task: Task): boolean {
  if (!task.due_date || task.status === 'completed' || task.status === 'reviewed') return false;
  const d = parseISO(task.due_date);
  if (!isValid(d)) return false;
  return d < new Date();
}

interface EmployeeWorkTasksTabProps {
  summary: DashboardSummary;
  tasks: Task[];
  activeTimer: TaskTimerSession | null;
  isCheckedIn: boolean;
  isActionLoading: string | null;
  onStartTimer: (taskId: string) => void;
  onPauseTimer: (taskId: string) => void;
  onResumeTimer: (taskId: string) => void;
  onStopTimer: (taskId: string) => void;
  onOpenTask: (task: Task) => void;
}

export function EmployeeWorkTasksTab({
  summary,
  tasks,
  activeTimer,
  isCheckedIn,
  isActionLoading,
  onStartTimer,
  onPauseTimer,
  onResumeTimer,
  onStopTimer,
  onOpenTask,
}: EmployeeWorkTasksTabProps) {
  const router = useRouter();

  const inProgress = tasks.filter((t) => t.status === 'in_progress');
  const completed = tasks.filter((t) => t.status === 'completed' || t.status === 'reviewed');
  const overdue = tasks.filter(isOverdue);

  const handleDiscuss = async (task: Task) => {
    try {
      const conv = await messagesApi.getOrCreateContextThread({
        related_entity_type: 'task',
        related_entity_id: task.id,
        title: `Task: ${task.title}`,
      });
      router.push(`/messages?conversation_id=${conv.id}`);
    } catch (error) {
      toast.error('Failed to open discussion: ' + getErrorMessage(error));
    }
  };

  const renderTimerActions = (task: Task) => {
    const loading = isActionLoading === task.id;
    if (activeTimer?.task_id === task.id) {
      return (
        <div className="flex justify-end gap-1">
          {activeTimer.status === 'running' ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 rounded-lg text-[10px]"
              onClick={() => onPauseTimer(task.id)}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Clock className="h-3 w-3" />}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 rounded-lg text-[10px]"
              onClick={() => onResumeTimer(task.id)}
              disabled={loading || !isCheckedIn}
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            className="h-8 px-2 rounded-lg text-[10px]"
            onClick={() => onStopTimer(task.id)}
            disabled={loading}
          >
            <StopCircle className="h-3 w-3" />
          </Button>
        </div>
      );
    }
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-8 rounded-lg text-[10px]"
        onClick={() => onStartTimer(task.id)}
        disabled={loading || activeTimer !== null || !isCheckedIn}
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 mr-1" />}
        Start
      </Button>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <AdminMetricCard title="Assigned Tasks" value={tasks.length} icon={Briefcase} />
        <AdminMetricCard title="In Progress" value={inProgress.length} icon={Clock} />
        <AdminMetricCard title="Completed" value={completed.length} icon={Briefcase} />
        <AdminMetricCard
          title="Overdue"
          value={overdue.length}
          subtitle={overdue.length > 0 ? 'Needs attention' : 'All on track'}
          icon={Clock}
        />
      </div>

      {summary.active_timer_task_id && (
        <div className="rounded-xl border border-[var(--accent-primary)]/30 bg-[var(--accent-soft)] p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-primary)]">Active task</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {summary.active_timer_task_title || 'Task in progress'}
            </p>
          </div>
          <Link href="/employee/time-logs">
            <Button size="sm" variant="outline" className="rounded-lg text-xs">
              Time Logs
            </Button>
          </Link>
        </div>
      )}

      {tasks.length === 0 ? (
        <EmptyState
          title="No tasks assigned"
          description="Your task queue is empty. Create a task or wait for assignments."
          icon={Briefcase}
          action={
            <Link href="/employee/tasks">
              <Button size="sm" className="rounded-lg text-xs">Go to Tasks</Button>
            </Link>
          }
        />
      ) : (
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-3 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Task List
            </h3>
            <Link href="/employee/tasks" className="text-[10px] font-semibold text-[var(--accent-primary)] hover:underline">
              View all
            </Link>
          </div>
          <AdminDataTable
            data={tasks.slice(0, 12)}
            emptyMessage="No tasks"
            columns={[
              {
                key: 'title',
                header: 'Task',
                render: (task) => (
                  <button
                    type="button"
                    onClick={() => onOpenTask(task)}
                    className="text-left font-semibold hover:text-[var(--accent-primary)] hover:underline line-clamp-1"
                  >
                    {task.title}
                  </button>
                ),
              },
              {
                key: 'project',
                header: 'Project',
                render: (task) => (
                  <span className="text-[var(--text-secondary)]">{task.project_title || 'General'}</span>
                ),
              },
              {
                key: 'priority',
                header: 'Priority',
                render: (task) => <StatusBadge status={task.priority} />,
              },
              {
                key: 'status',
                header: 'Status',
                render: (task) => <StatusBadge status={task.status} />,
              },
              {
                key: 'due',
                header: 'Due',
                render: (task) => (
                  <span className={cn(isOverdue(task) && 'text-[var(--status-danger-text)] font-bold')}>
                    {formatDueDate(task.due_date)}
                  </span>
                ),
              },
              {
                key: 'timer',
                header: 'Timer',
                className: 'text-right',
                render: (task) => renderTimerActions(task),
              },
              {
                key: 'discuss',
                header: '',
                className: 'text-right w-20',
                render: (task) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-[10px] text-[var(--accent-primary)]"
                    onClick={() => handleDiscuss(task)}
                  >
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Discuss
                  </Button>
                ),
              },
            ]}
          />
        </div>
      )}
    </div>
  );
}
