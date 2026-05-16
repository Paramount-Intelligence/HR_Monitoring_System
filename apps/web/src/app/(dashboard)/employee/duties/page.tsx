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
      toast.success('Duty added successfully');
      setNewTitle('');
      setNewDesc('');
      setIsDialogOpen(false);
    } catch (error) {
      toast.error('Failed to add duty');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleStatus(id: string, currentStatus: string) {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      const updated = await dutiesApi.updateDutyStatus(id, newStatus);
      setDuties(duties.map(d => d.id === id ? updated : d));
      if (newStatus === 'completed') toast.success('Duty marked as completed');
    } catch (error) {
      toast.error('Failed to update status');
    }
  }

  async function handleDelete() {
    if (!dutyToDelete) return;
    try {
      await dutiesApi.deleteDuty(dutyToDelete);
      setDuties(duties.filter(d => d.id !== dutyToDelete));
      toast.success('Duty removed');
      setDutyToDelete(null);
    } catch (error) {
      toast.error('Failed to remove duty');
    }
  }

  const completed = duties.filter(d => d.status === 'completed');
  const pending = duties.filter(d => d.status === 'pending');
  const progress = duties.length ? Math.round((completed.length / duties.length) * 100) : 0;

  return (
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 text-indigo-600 mb-1.5">
            <ClipboardCheck className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Daily Objectives</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">Daily Duties</h1>
          <p className="text-slate-500 font-bold text-sm tracking-tight uppercase opacity-60">Recurring Responsibilities & Execution Checklist</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-[0.2em] px-8 rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-95">
              <Plus className="mr-2 h-4 w-4" /> ADD OBJECTIVE
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none shadow-premium-lg p-10 animate-in zoom-in-95 duration-300">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-3xl font-black text-slate-900 tracking-tighter">Define Objective</DialogTitle>
              <DialogDescription className="text-sm font-bold text-slate-500 uppercase tracking-tight">
                Record a responsibility for today's operational layer
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddDuty} className="space-y-8 pt-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Objective Identifier</Label>
                <Input 
                  id="title" 
                  value={newTitle} 
                  onChange={e => setNewTitle(e.target.value)} 
                  placeholder="e.g. Server maintenance check"
                  className="h-12 rounded-xl bg-slate-50/50 border-slate-100 font-bold focus:bg-white transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Operational Context</Label>
                <Textarea 
                  id="desc" 
                  value={newDesc} 
                  onChange={e => setNewDesc(e.target.value)} 
                  placeholder="Technical details or scope..."
                  className="resize-none rounded-[1.5rem] bg-slate-50/50 border-slate-100 min-h-[120px] font-bold text-sm leading-relaxed p-6 focus:bg-white transition-all"
                />
              </div>
              <DialogFooter className="pt-6 gap-4">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="h-14 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all flex-1">Discard</Button>
                <Button type="submit" disabled={isSubmitting || !newTitle.trim()} className="h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-[0.2em] px-10 rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-95 flex-1">
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  SAVE OBJECTIVE
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
                    {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}
                </div>
            ) : duties.length === 0 ? (
                <EmptyState 
                    title="No duties recorded for today"
                    description="Populate your duty list to maintain operational visibility."
                    icon={ClipboardCheck}
                    action={{ label: "Add First Duty", onClick: () => setIsDialogOpen(true) }}
                />
            ) : (
                <div className="space-y-6">
                    {pending.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Active Priorities</h3>
                            <div className="h-px w-full bg-slate-100" />
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
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Execution Complete</h3>
                            <div className="h-px w-full bg-slate-100" />
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
          <Card className="border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden sticky top-6">
            <CardHeader className="px-8 pt-8 pb-4 border-b border-slate-50/50">
              <CardTitle className="text-xl font-black text-slate-900 tracking-tight">Daily Analytics</CardTitle>
              <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">Aggregate Efficiency Metrics</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 shadow-inner">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total</div>
                    <div className="text-3xl font-black text-slate-900 tracking-tighter">{duties.length}</div>
                  </div>
                  <div className="bg-emerald-50 p-5 rounded-[1.5rem] border border-emerald-100 shadow-inner">
                    <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Finalized</div>
                    <div className="text-3xl font-black text-emerald-700 tracking-tighter">{completed.length}</div>
                  </div>
              </div>
              
              <div className="p-8 bg-indigo-600 rounded-[2rem] shadow-xl shadow-indigo-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 transition-transform group-hover:scale-110 duration-700">
                    <ClipboardCheck className="h-20 w-20 rotate-12" />
                </div>
                <div className="relative z-10">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-black text-indigo-100 uppercase tracking-[0.2em]">Daily Velocity</span>
                      <span className="text-2xl font-black text-white font-mono tracking-tighter">
                          {progress}%
                      </span>
                    </div>
                    <div className="h-3 w-full bg-indigo-400/30 rounded-full overflow-hidden ring-1 ring-white/10">
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
        title="Remove Duty"
        description="This will permanently delete this duty from today's execution log. This action cannot be undone."
        confirmLabel="REMOVE DUTY"
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
        ? "bg-slate-50/50 border-slate-100 opacity-60" 
        : "bg-white border-slate-100 shadow-sm hover:border-indigo-100 hover:shadow-premium"
    )}>
      <div className="flex items-start gap-5 flex-1">
        <button 
          onClick={onToggle}
          className={cn(
            "mt-1 shrink-0 h-7 w-7 rounded-xl border-2 flex items-center justify-center transition-all focus:outline-none",
            isCompleted 
                ? "bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-100" 
                : "bg-white border-slate-200 hover:border-indigo-400 group-hover:scale-110 shadow-sm"
          )}
        >
          {isCompleted && <CheckSquare className="h-4 w-4 text-white" />}
        </button>
        <div className="flex-1">
          <p className={cn(
            "text-base font-black transition-all tracking-tight",
            isCompleted ? "text-slate-400 line-through" : "text-slate-900"
          )}>
            {duty.title}
          </p>
          {duty.description && (
            <p className={cn(
              "text-xs mt-1.5 font-bold leading-relaxed",
              isCompleted ? "text-slate-300" : "text-slate-500"
            )}>
              {duty.description}
            </p>
          )}
        </div>
      </div>
      <button 
        onClick={onDelete}
        className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-3 rounded-2xl hover:bg-rose-50"
        aria-label="Delete duty"
      >
        <Trash2 className="h-5 w-5" />
      </button>
    </div>
  );
}
