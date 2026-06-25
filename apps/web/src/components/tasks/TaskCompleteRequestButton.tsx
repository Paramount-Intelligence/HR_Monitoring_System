'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Task } from '@/lib/api/tasks';
import type { TaskTimerSession } from '@/lib/api/timeLogs';
import { taskCompletionRequestsApi } from '@/lib/api/taskCompletionRequests';
import { getErrorMessage } from '@/lib/api/client';
import {
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
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface TaskCompleteRequestButtonProps {
  task: Task;
  role?: string | null;
  currentUserId?: string | null;
  activeTimer?: TaskTimerSession | null;
  onSuccess?: () => void;
  className?: string;
  size?: 'sm' | 'default';
}

export function TaskCompleteRequestButton({
  task,
  role,
  currentUserId,
  activeTimer,
  onSuccess,
  className,
  size = 'sm',
}: TaskCompleteRequestButtonProps) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const state = getCompleteTaskButtonState({
    role,
    task,
    currentUserId,
    activeTimer,
    pendingCompletionRequest: task.pending_completion_request,
  });

  if (state === 'hidden') {
    return null;
  }

  const label = getCompleteTaskButtonLabel(state);
  const canClick = state === 'complete' || state === 'rejected';
  const isDisabled = !canClick || submitting;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await taskCompletionRequestsApi.create(task.id, {
        request_note: note.trim() || undefined,
      });
      toast.success('Completion request sent to your manager.');
      setOpen(false);
      setNote('');
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
        variant={state === 'complete' || state === 'rejected' ? 'default' : 'outline'}
        className={cn(
          'rounded-lg font-semibold',
          (state === 'pending' || state === 'completed') && 'pointer-events-none opacity-80',
          className
        )}
        disabled={isDisabled}
        title={state === 'timer_active' ? label : undefined}
        onClick={() => {
          if (canClick) setOpen(true);
        }}
      >
        {state === 'complete' || state === 'rejected' ? (
          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
        ) : null}
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Task Completion</DialogTitle>
            <DialogDescription>
              Your manager will review this request before the task is marked completed.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note for your manager…"
              className="min-h-[96px] resize-none rounded-lg"
            />
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
