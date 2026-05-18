'use client';

import { useState, useEffect } from 'react';
import { dutiesApi, Duty } from '@/lib/api/duties';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  Plus, Loader2, ClipboardCheck, Trash2, CheckSquare 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle, DialogTrigger 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { KPICardSkeleton } from '@/components/dashboard/KPICard';
import { EmptyState } from '@/components/ui/empty-state';

export default function DutiesPage() {
  const [duties, setDuties] = useState<Duty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dutyToDelete, setDutyToDelete] = useState<string | null>(null);
  
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => { loadDuties(); }, []);

  async function loadDuties() {
    try {
      setIsLoading(true);
      const data = await dutiesApi.getDailyDuties();
      setDuties(data);
    } catch (error) {
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
    } catch (error) {
      toast.error('Failed to add action');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleStatus(id: string, currentStatus: string) {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      const updated = await dutiesApi.updateDutyStatus(id, newStatus);
      setDuties(duties.map(d => d.id === id ? updated : d));
      if (newStatus === 'completed') toast.success('Action marked as completed');
    } catch (error) {
      toast.error('Failed to update status');
    }
  }

  async function handleDelete() {
    if (!dutyToDelete) return;
    try {
      await dutiesApi.deleteDuty(dutyToDelete);
      setDuties(duties.filter(d => d.id !== dutyToDelete));
      toast.success('Action removed');
      setDutyToDelete(null);
    } catch (error) {
      toast.error('Failed to remove action');
    }
  }

  const completed = duties.filter(d => d.status === 'completed');
  const pending = duties.filter(d => d.status === 'pending');
  const progress = duties.length ? Math.round((completed.length / duties.length) * 100) : 0;

  return (
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto animate-in fade-in duration-700 text-[var(--text-primary)]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 text-[var(--accent-primary)] mb-1.5">
            <ClipboardCheck className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Objectives</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-[var(--text-primary)] sm:text-5xl">Key Actions</h1>
          <p className="text-[var(--text-secondary)] font-bold text-sm tracking-tight uppercase opacity-60">Add and track key actions and responsibilities for today</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-14 bg-[var(--accent-primary)] hover:opacity-90 text-white font-black text-[10px] uppercase tracking-[0.2em] px-8 rounded-2xl border-none shadow-xl transition-all active:scale-95">
              <Plus className="mr-2 h-4 w-4 text-white" /> ADD ACTION
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none bg-[var(--bg-surface)] shadow-[var(--shadow-hard)] p-10 animate-in zoom-in-95 duration-300 text-[var(--text-primary)]">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-3xl font-black tracking-tighter text-[var(--text-primary)]">Add Key Action</DialogTitle>
              <DialogDescription className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-tight">
                Add a responsibility or action for today
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddDuty} className="space-y-8 pt-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Action Title</Label>
                <Input 
                  id="title" 
                  value={newTitle} 
                  onChange={e => setNewTitle(e.target.value)} 
                  placeholder="e.g. Server maintenance check"
                  className="h-12 rounded-xl bg-[var(--bg-subtle)]/50 border-[var(--border-default)] font-bold text-[var(--text-primary)] focus:bg-[var(--bg-surface)] transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc" className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Description</Label>
                <Textarea 
                  id="desc" 
                  value={newDesc} 
                  onChange={e => setNewDesc(e.target.value)} 
                  placeholder="Details or scope of this action..."
                  className="resize-none rounded-[1.5rem] bg-[var(--bg-subtle)]/50 border-[var(--border-default)] text-[var(--text-primary)] min-h-[120px] font-bold text-sm leading-relaxed p-6 focus:bg-[var(--bg-surface)] transition-all"
                />
              </div>
              <DialogFooter className="pt-6 gap-4">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="h-14 rounded-2xl font-black text-xs uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all flex-1">Discard</Button>
                <Button type="submit" disabled={isSubmitting || !newTitle.trim()} className="h-14 bg-[var(--accent-primary)] hover:opacity-90 text-white font-black text-[10px] uppercase tracking-[0.2em] px-10 rounded-2xl border-none shadow-xl transition-all active:scale-95 flex-1">
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" /> : null}
                  Save Action
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        <div className="lg:col-span-8 space-y-4">
            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-24 bg-[var(--bg-subtle)] rounded-2xl animate-pulse" />)}
                </div>
            ) : duties.length === 0 ? (
                <EmptyState 
                    title="No actions added for today"
                    description="Add key actions to track your daily progress."
                    icon={ClipboardCheck}
                    action={{ label: "Add Action", onClick: () => setIsDialogOpen(true) }}
                />
            ) : (
                <div className="space-y-6">
                    {pending.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest whitespace-nowrap">Pending Actions</h3>
                            <div className="h-px w-full bg-[var(--border-subtle)]" />
                        </div>
                        <div className="space-y-3">
                        {pending.map(duty => (
                            <DutyCard key={duty.id} duty={duty} onToggle={() => handleToggleStatus(duty.id, duty.status)} onDelete={() => setDutyToDelete(duty.id)} />
                        ))}
                        </div>
                    </div>
                    )}
                    
                    {completed.length > 0 && (
                    <div className="space-y-4 opacity-75 grayscale-[0.5]">
                        <div className="flex items-center gap-3">
                            <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest whitespace-nowrap">Completed Actions</h3>
                            <div className="h-px w-full bg-[var(--border-subtle)]" />
                        </div>
                        <div className="space-y-3">
                        {completed.map(duty => (
                            <DutyCard key={duty.id} duty={duty} onToggle={() => handleToggleStatus(duty.id, duty.status)} onDelete={() => setDutyToDelete(duty.id)} />
                        ))}
                        </div>
                    </div>
                    )}
                </div>
            )}
        </div>

        <div className="lg:col-span-4 space-y-8">
          <Card className="border-none shadow-[var(--shadow-soft)] bg-[var(--bg-surface)] rounded-[2.5rem] overflow-hidden sticky top-6 text-[var(--text-primary)]">
            <CardHeader className="px-8 pt-8 pb-4 border-b border-[var(--border-subtle)]">
              <CardTitle className="text-xl font-black text-[var(--text-primary)] tracking-tight">Daily Progress</CardTitle>
              <CardDescription className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Progress metrics</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[var(--bg-subtle)] p-5 rounded-[1.5rem] border border-[var(--border-subtle)] shadow-inner">
                    <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Total</div>
                    <div className="text-3xl font-black text-[var(--text-primary)] tracking-tighter">{duties.length}</div>
                  </div>
                  <div className="bg-emerald-50 p-5 rounded-[1.5rem] border border-emerald-100 shadow-inner">
                    <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Completed</div>
                    <div className="text-3xl font-black text-emerald-700 tracking-tighter">{completed.length}</div>
                  </div>
              </div>
              
              <div className="p-8 bg-[var(--accent-primary)] rounded-[2rem] shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 transition-transform group-hover:scale-110 duration-700">
                    <ClipboardCheck className="h-20 w-20 rotate-12 text-white" />
                </div>
                <div className="relative z-10 text-white">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-black text-white/80 uppercase tracking-[0.2em]">Daily Progress</span>
                      <span className="text-2xl font-black text-white font-mono tracking-tighter">
                          {progress}%
                      </span>
                    </div>
                    <div className="h-3 w-full bg-white/30 rounded-full overflow-hidden ring-1 ring-white/10">
                    <div 
                        className="h-full bg-white transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(255,255,255,0.5)]" 
                        style={{ width: `${progress}%` }}
                    />
                    </div>
                </div>
              </div>
            </CardContent>
          </Card>
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
    </div>
  );
}

function DutyCard({ duty, onToggle, onDelete }: { duty: Duty, onToggle: () => void, onDelete: () => void }) {
  const isCompleted = duty.status === 'completed';
  
  return (
    <div className={cn(
      "flex items-start justify-between p-6 border rounded-[2rem] transition-all duration-500 group",
      isCompleted 
        ? "bg-[var(--bg-subtle)]/50 border-[var(--border-subtle)] opacity-60" 
        : "bg-[var(--bg-surface)] border-[var(--border-subtle)] shadow-sm hover:shadow-[var(--shadow-soft)]"
    )}>
      <div className="flex items-start gap-5 flex-1">
        <button 
          onClick={onToggle}
          className={cn(
            "mt-1 shrink-0 h-7 w-7 rounded-xl border-2 flex items-center justify-center transition-all focus:outline-none",
            isCompleted 
                ? "bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-100" 
                : "bg-[var(--bg-surface)] border-[var(--border-default)] hover:border-[var(--accent-primary)] group-hover:scale-110 shadow-sm"
          )}
        >
          {isCompleted && <CheckSquare className="h-4 w-4 text-white" />}
        </button>
        <div className="flex-1">
          <p className={cn(
            "text-base font-black transition-all tracking-tight",
            isCompleted ? "text-[var(--text-muted)] line-through" : "text-[var(--text-primary)]"
          )}>
            {duty.title}
          </p>
          {duty.description && (
            <p className={cn(
              "text-xs mt-1.5 font-bold leading-relaxed",
              isCompleted ? "text-[var(--text-muted)]" : "text-[var(--text-secondary)]"
            )}>
              {duty.description}
            </p>
          )}
        </div>
      </div>
      <button 
        onClick={onDelete}
        className="text-[var(--text-muted)] hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-3 rounded-2xl hover:bg-rose-50 border-none"
        aria-label="Delete action"
      >
        <Trash2 className="h-5 w-5" />
      </button>
    </div>
  );
}
