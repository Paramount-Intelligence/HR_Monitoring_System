'use client';

import { useState, useEffect } from 'react';
import { dutiesApi, Duty } from '@/lib/api/duties';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckSquare, Plus, Loader2, ClipboardCheck, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function DutiesPage() {
  const [duties, setDuties] = useState<Duty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to remove this duty?')) return;
    try {
      await dutiesApi.deleteDuty(id);
      setDuties(duties.filter(d => d.id !== id));
      toast.success('Duty removed');
    } catch (error) {
      toast.error('Failed to remove duty');
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
      </div>
    );
  }

  const completed = duties.filter(d => d.status === 'completed');
  const pending = duties.filter(d => d.status === 'pending');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">My Duties</h1>
          <p className="text-sm text-slate-500">Track and manage your daily recurring responsibilities.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={<Button className="bg-blue-600 hover:bg-blue-700" />} >
            <Plus className="mr-2 h-4 w-4" /> Add Duty
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Duty</DialogTitle>
              <DialogDescription>
                Record a responsibility or task for today's EOD summary.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddDuty} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Duty Title</Label>
                <Input 
                  id="title" 
                  value={newTitle} 
                  onChange={e => setNewTitle(e.target.value)} 
                  placeholder="e.g. Server maintenance check"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Quick Notes (Optional)</Label>
                <Textarea 
                  id="desc" 
                  value={newDesc} 
                  onChange={e => setNewDesc(e.target.value)} 
                  placeholder="Any details to remember..."
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting || !newTitle.trim()} className="bg-blue-600 hover:bg-blue-700">
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Duty
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="shadow-sm md:col-span-2">
          <CardHeader>
            <CardTitle>Today's Duties</CardTitle>
            <CardDescription>Check off items as you complete them</CardDescription>
          </CardHeader>
          <CardContent>
            {duties.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 border border-dashed rounded-lg">
                <ClipboardCheck className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-4 text-sm font-semibold text-slate-900">No duties recorded</h3>
                <p className="mt-2 text-sm text-slate-500">Add a duty to track your regular work.</p>
                <Button variant="outline" className="mt-4" onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Add Duty
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {pending.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-500 mb-3 uppercase tracking-wider">Pending</h3>
                    <div className="space-y-2">
                      {pending.map(duty => (
                        <DutyCard key={duty.id} duty={duty} onToggle={() => handleToggleStatus(duty.id, duty.status)} onDelete={() => handleDelete(duty.id)} />
                      ))}
                    </div>
                  </div>
                )}
                
                {completed.length > 0 && (
                  <div className="pt-4 mt-4 border-t">
                    <h3 className="text-sm font-medium text-slate-500 mb-3 uppercase tracking-wider">Completed</h3>
                    <div className="space-y-2">
                      {completed.map(duty => (
                        <DutyCard key={duty.id} duty={duty} onToggle={() => handleToggleStatus(duty.id, duty.status)} onDelete={() => handleDelete(duty.id)} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-slate-500">Total Duties</span>
                <span className="font-bold text-slate-900">{duties.length}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-slate-500">Completed</span>
                <span className="font-bold text-emerald-600">{completed.length}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-500">Pending</span>
                <span className="font-bold text-amber-600">{pending.length}</span>
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium text-slate-500">Progress</span>
                  <span className="text-xs font-medium text-blue-600">
                    {duties.length ? Math.round((completed.length / duties.length) * 100) : 0}%
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-500" 
                    style={{ width: `${duties.length ? (completed.length / duties.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DutyCard({ duty, onToggle, onDelete }: { duty: Duty, onToggle: () => void, onDelete: () => void }) {
  const isCompleted = duty.status === 'completed';
  
  return (
    <div className={cn(
      "flex items-start justify-between p-4 border rounded-xl transition-all shadow-sm group",
      isCompleted ? "bg-slate-50 border-slate-200" : "bg-white border-blue-100 hover:border-blue-200"
    )}>
      <div className="flex items-start gap-4 flex-1">
        <button 
          onClick={onToggle}
          className={cn(
            "mt-0.5 shrink-0 h-5 w-5 rounded-md border flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
            isCompleted ? "bg-emerald-500 border-emerald-500" : "bg-white border-slate-300 hover:border-blue-400"
          )}
        >
          {isCompleted && <CheckSquare className="h-3.5 w-3.5 text-white" />}
        </button>
        <div className="flex-1">
          <p className={cn(
            "text-sm font-medium transition-colors",
            isCompleted ? "text-slate-500 line-through" : "text-slate-900"
          )}>
            {duty.title}
          </p>
          {duty.description && (
            <p className={cn(
              "text-xs mt-1",
              isCompleted ? "text-slate-400" : "text-slate-500"
            )}>
              {duty.description}
            </p>
          )}
        </div>
      </div>
      <button 
        onClick={onDelete}
        className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 ml-2"
        aria-label="Delete duty"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
