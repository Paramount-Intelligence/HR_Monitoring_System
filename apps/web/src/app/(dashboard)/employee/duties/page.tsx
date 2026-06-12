'use client';

import { useState, useEffect, useMemo } from 'react';
import { dutiesApi, Duty } from '@/lib/api/duties';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Plus, Loader2, ClipboardCheck, Trash2, CheckSquare, Target, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { EmployeePageShell } from '@/components/employee/EmployeePageShell';
import { EmployeePageHeader } from '@/components/employee/EmployeePageHeader';
import { EmployeeMetricGrid } from '@/components/employee/EmployeeMetricGrid';
import { EmployeeMetricCard } from '@/components/employee/EmployeeMetricCard';
import { EmployeeSectionCard } from '@/components/employee/EmployeeSectionCard';

export default function DutiesPage() {
  const [duties, setDuties] = useState<Duty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dutyToDelete, setDutyToDelete] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    loadDuties();
  }, []);

  async function loadDuties() {
    try {
      setIsLoading(true);
      const data = await dutiesApi.getDailyDuties();
      setDuties(data);
    } catch {
      toast.error('Failed to load duties');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddDuty(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      setIsSubmitting(true);
      const duty = await dutiesApi.createDuty({ title: newTitle, description: newDesc });
      setDuties([duty, ...duties]);
      toast.success('Action added successfully');
      setNewTitle('');
      setNewDesc('');
      setIsDialogOpen(false);
    } catch {
      toast.error('Failed to add action');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleStatus(id: string, currentStatus: string) {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      const updated = await dutiesApi.updateDutyStatus(id, newStatus);
      setDuties(duties.map((d) => (d.id === id ? updated : d)));
      if (newStatus === 'completed') toast.success('Action marked as completed');
    } catch {
      toast.error('Failed to update status');
    }
  }

  async function handleDelete() {
    if (!dutyToDelete) return;
    try {
      await dutiesApi.deleteDuty(dutyToDelete);
      setDuties(duties.filter((d) => d.id !== dutyToDelete));
      toast.success('Action removed');
      setDutyToDelete(null);
    } catch {
      toast.error('Failed to remove action');
    }
  }

  const completed = duties.filter((d) => d.status === 'completed');
  const pending = duties.filter((d) => d.status === 'pending');
  const progress = duties.length ? Math.round((completed.length / duties.length) * 100) : 0;

  const stats = useMemo(
    () => ({
      total: duties.length,
      pending: pending.length,
      completed: completed.length,
      progress,
    }),
    [duties.length, pending.length, completed.length, progress]
  );

  return (
    <EmployeePageShell>
      <EmployeePageHeader
        title="Key Actions"
        subtitle="Add and track daily responsibilities and key actions"
        icon={ClipboardCheck}
        actions={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-lg text-xs">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Action
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <form onSubmit={handleAddDuty} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <DialogHeader>
                  <DialogTitle>Add Key Action</DialogTitle>
                  <DialogDescription>Add a responsibility or action for today</DialogDescription>
                </DialogHeader>
                <DialogBody className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-xs">Action Title</Label>
                    <Input
                      id="title"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. Server maintenance check"
                      className="h-9 rounded-lg"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="desc" className="text-xs">Description</Label>
                    <Textarea
                      id="desc"
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      placeholder="Details or scope of this action..."
                      className="min-h-[80px] rounded-lg resize-none"
                    />
                  </div>
                </DialogBody>
                <DialogFooter>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setIsDialogOpen(false)}>
                    Discard
                  </Button>
                  <Button type="submit" size="sm" disabled={isSubmitting || !newTitle.trim()}>
                    {isSubmitting && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
                    Save Action
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <EmployeeMetricGrid>
        <EmployeeMetricCard title="Total Actions" value={stats.total} icon={Target} />
        <EmployeeMetricCard title="Pending" value={stats.pending} icon={ClipboardCheck} />
        <EmployeeMetricCard title="Completed" value={stats.completed} icon={CheckSquare} />
        <EmployeeMetricCard title="Progress" value={`${stats.progress}%`} icon={TrendingUp} />
      </EmployeeMetricGrid>

      <div className="grid gap-4 lg:grid-cols-12 items-start">
        <div className="lg:col-span-8">
          <EmployeeSectionCard title="Today's Actions" icon={ClipboardCheck}>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-[var(--bg-subtle)] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : duties.length === 0 ? (
              <EmptyState
                title="No actions added for today"
                description="Add key actions to track your daily progress."
                icon={ClipboardCheck}
                action={
                  <Button size="sm" className="rounded-lg" onClick={() => setIsDialogOpen(true)}>
                    Add Action
                  </Button>
                }
              />
            ) : (
              <div className="space-y-5">
                {pending.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Pending ({pending.length})
                    </p>
                    <div className="space-y-2">
                      {pending.map((duty) => (
                        <DutyCard
                          key={duty.id}
                          duty={duty}
                          onToggle={() => handleToggleStatus(duty.id, duty.status)}
                          onDelete={() => setDutyToDelete(duty.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {completed.length > 0 && (
                  <div className="space-y-3 opacity-80">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Completed ({completed.length})
                    </p>
                    <div className="space-y-2">
                      {completed.map((duty) => (
                        <DutyCard
                          key={duty.id}
                          duty={duty}
                          onToggle={() => handleToggleStatus(duty.id, duty.status)}
                          onDelete={() => setDutyToDelete(duty.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </EmployeeSectionCard>
        </div>

        <div className="lg:col-span-4">
          <EmployeeSectionCard title="Daily Progress" icon={CheckSquare}>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-muted)]">Completion</span>
                <span className="font-bold text-[var(--accent-primary)] tabular-nums">{progress}%</span>
              </div>
              <div className="h-2 w-full bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent-primary)] transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3 text-center">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Pending</p>
                  <p className="text-lg font-bold">{pending.length}</p>
                </div>
                <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3 text-center">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Done</p>
                  <p className="text-lg font-bold text-emerald-600">{completed.length}</p>
                </div>
              </div>
            </div>
          </EmployeeSectionCard>
        </div>
      </div>

      <ConfirmDialog
        open={dutyToDelete !== null}
        onOpenChange={(open) => !open && setDutyToDelete(null)}
        title="Delete Action"
        description="This will permanently delete this action. This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={handleDelete}
      />
    </EmployeePageShell>
  );
}

function DutyCard({
  duty,
  onToggle,
  onDelete,
}: {
  duty: Duty;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const isCompleted = duty.status === 'completed';

  return (
    <div
      className={cn(
        'flex items-start justify-between p-3 border rounded-xl transition-all group',
        isCompleted
          ? 'bg-[var(--bg-subtle)]/50 border-[var(--border-subtle)] opacity-70'
          : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] hover:border-[var(--border-default)]'
      )}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'mt-0.5 shrink-0 h-6 w-6 rounded-md border-2 flex items-center justify-center transition-all focus:outline-none',
            isCompleted
              ? 'bg-emerald-500 border-emerald-500'
              : 'bg-[var(--bg-surface)] border-[var(--border-default)] hover:border-[var(--accent-primary)]'
          )}
        >
          {isCompleted && <CheckSquare className="h-3.5 w-3.5 text-white" />}
        </button>
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              'text-sm font-semibold',
              isCompleted ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'
            )}
          >
            {duty.title}
          </p>
          {duty.description && (
            <p className={cn('text-xs mt-1 leading-relaxed', isCompleted ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)]')}>
              {duty.description}
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="text-[var(--text-muted)] hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 shrink-0"
        aria-label="Delete action"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
