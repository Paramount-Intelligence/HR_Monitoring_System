'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Task } from '@/lib/api/tasks';
import type { TaskTimerSession } from '@/lib/api/timeLogs';
import { tasksApi } from '@/lib/api/tasks';
import { getErrorMessage } from '@/lib/api/client';
import {
  dispatchTaskAndEodRefresh,
  getCompleteTaskButtonLabel,
  getCompleteTaskButtonState,
} from '@/lib/tasks/completion-request-utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface TaskCompleteRequestButtonProps {
  task: Task;
  role?: string | null;
  currentUserId?: string | null;
  activeTimer?: TaskTimerSession | null;
  onSuccess?: () => void;
  className?: string;
  size?: 'sm' | 'default';
  /** Compact styling for task table rows */
  compact?: boolean;
}

/** Mark own/assigned tasks complete immediately — no manager approval required. */
export function TaskCompleteRequestButton({
  task,
  role,
  currentUserId,
  activeTimer,
  onSuccess,
  className,
  size = 'sm',
  compact = false,
}: TaskCompleteRequestButtonProps) {
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const state = getCompleteTaskButtonState({
    role,
    task,
    currentUserId,
    activeTimer,
  });

  if (state === 'hidden') {
    return null;
  }

  const label = getCompleteTaskButtonLabel(state);
  const canClick = state === 'complete' || state === 'stop_and_complete';
  const isDisabled = !canClick || submitting;

  const handleComplete = async () => {
    if (!canClick) return;
    setSubmitting(true);
    try {
      await tasksApi.completeTask(task.id);
      toast.success('Task marked as completed.');
      setConfirmOpen(false);
      dispatchTaskAndEodRefresh();
      onSuccess?.();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        size={size}
        variant={canClick ? 'default' : 'outline'}
        className={cn(
          compact
            ? 'h-9 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] px-3'
            : 'rounded-lg font-semibold',
          state === 'completed' && 'pointer-events-none opacity-80',
          className,
        )}
        disabled={isDisabled}
        onClick={() => {
          if (!canClick) return;
          if (state === 'stop_and_complete') {
            setConfirmOpen(true);
            return;
          }
          void handleComplete();
        }}
      >
        {submitting ? (
          <Loader2 className={cn('h-3.5 w-3.5 animate-spin', !compact && 'mr-1.5')} />
        ) : canClick ? (
          <CheckCircle2 className={cn('h-3.5 w-3.5', !compact && 'mr-1.5')} />
        ) : null}
        {label}
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Stop timer and complete?</DialogTitle>
            <DialogDescription>
              The active timer on &quot;{task.title}&quot; will be stopped and the task marked as completed.
            </DialogDescription>
          </DialogHeader>
          <DialogBody />
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={() => void handleComplete()} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
              Stop &amp; Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
