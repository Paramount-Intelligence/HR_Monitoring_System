'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  taskCompletionRequestsApi,
  type TaskCompletionRequest,
} from '@/lib/api/taskCompletionRequests';
import { getErrorMessage } from '@/lib/api/client';
import { formatPKDate } from '@/lib/time';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AdminDataTable } from '@/components/admin/dashboard/AdminDataTable';
import { EmptyState } from '@/components/ui/empty-state';

interface ManagerCompletionRequestsPanelProps {
  compact?: boolean;
}

export function ManagerCompletionRequestsPanel({
  compact = false,
}: ManagerCompletionRequestsPanelProps) {
  const [requests, setRequests] = useState<TaskCompletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [approveTarget, setApproveTarget] = useState<TaskCompletionRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<TaskCompletionRequest | null>(null);
  const [rejectComment, setRejectComment] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await taskCompletionRequestsApi.list({ status: 'pending' });
      setRequests(rows);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleApprove = async () => {
    if (!approveTarget) return;
    setActionId(approveTarget.id);
    try {
      await taskCompletionRequestsApi.approve(approveTarget.id, {});
      toast.success('Task marked as completed.');
      setApproveTarget(null);
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectComment.trim()) return;
    setActionId(rejectTarget.id);
    try {
      await taskCompletionRequestsApi.reject(rejectTarget.id, {
        manager_comment: rejectComment.trim(),
      });
      toast.success('Completion request rejected.');
      setRejectTarget(null);
      setRejectComment('');
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-10 text-center text-sm text-[var(--text-muted)]">
        Loading completion requests…
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <EmptyState
        title="No pending completion requests"
        description="Intern completion requests will appear here for your review."
        icon={CheckCircle2}
      />
    );
  }

  return (
    <>
      <AdminDataTable
        data={requests}
        emptyMessage="No pending completion requests"
        columns={[
          {
            key: 'intern',
            header: 'Intern',
            render: (row) => (
              <span className="font-semibold text-[var(--text-primary)]">
                {row.requested_by_name || 'Intern'}
              </span>
            ),
          },
          {
            key: 'task',
            header: 'Task',
            render: (row) => (
              <div>
                <p className="font-medium text-[var(--text-primary)]">{row.task_title}</p>
                <p className="text-[11px] text-[var(--text-muted)]">{row.project_title || '—'}</p>
              </div>
            ),
          },
          {
            key: 'requested',
            header: 'Requested',
            render: (row) => formatPKDate(row.requested_at),
          },
          {
            key: 'note',
            header: 'Note',
            render: (row) => row.request_note || '—',
          },
          {
            key: 'status',
            header: 'Task status',
            render: (row) => <StatusBadge status={row.task_status} />,
          },
          {
            key: 'actions',
            header: 'Actions',
            render: (row) => (
              <div className="flex flex-wrap gap-1.5">
                <Button
                  size="sm"
                  className="h-7 text-[10px] rounded-lg"
                  disabled={actionId === row.id}
                  onClick={() => setApproveTarget(row)}
                >
                  {actionId === row.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Approve
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] rounded-lg"
                  disabled={actionId === row.id}
                  onClick={() => {
                    setRejectTarget(row);
                    setRejectComment('');
                  }}
                >
                  <XCircle className="mr-1 h-3 w-3" />
                  Reject
                </Button>
              </div>
            ),
          },
        ]}
      />

      <AlertDialog open={!!approveTarget} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve completion?</AlertDialogTitle>
            <AlertDialogDescription>
              Approve completion and mark &quot;{approveTarget?.task_title}&quot; as completed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove}>Approve</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject completion request</DialogTitle>
            <DialogDescription>
              Explain what the intern should address before resubmitting.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="Required feedback for the intern…"
              className="min-h-[96px] resize-none rounded-lg"
            />
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={!rejectComment.trim() || actionId === rejectTarget?.id}
              onClick={handleReject}
            >
              Reject request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
