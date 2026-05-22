'use client';

import { useState, useEffect } from 'react';
import { eodApi, EODReport } from '@/lib/api/eod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck, Clock, CheckSquare, Briefcase, FileText, Send, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function MyEODPage() {
  const [eod, setEod] = useState<EODReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadEOD();
  }, []);

  async function loadEOD() {
    try {
      setIsLoading(true);
      const data = await eodApi.getMyEOD();
      setEod(data);
    } catch (error) {
      toast.error('Failed to load EOD status');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGenerate() {
    try {
      setIsSubmitting(true);
      const generated = await eodApi.generateMyEOD();
      setEod(generated);
      toast.success('EOD Report auto-generated successfully');
    } catch (error) {
      toast.error('Failed to generate EOD');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit() {
    try {
      setIsSubmitting(true);
      const submitted = await eodApi.submitEOD();
      setEod(submitted);
      toast.success('EOD Report submitted to manager');
    } catch (error) {
      toast.error('Failed to submit EOD');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-[var(--text-muted)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto animate-in fade-in duration-700 text-[var(--text-primary)]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 text-[var(--accent-primary)] mb-1.5">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">EOD Dashboard</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-[var(--text-primary)] sm:text-5xl">End of Day Report</h1>
          <p className="text-[var(--text-secondary)] font-bold text-sm tracking-tight uppercase opacity-60">Review and submit your End of Day report</p>
        </div>
      </div>

      {!eod ? (
        <Card className="border-none shadow-[var(--shadow-soft)] bg-[var(--bg-surface)] rounded-[2.5rem] overflow-hidden text-center py-24">
          <CardContent className="flex flex-col items-center">
            <div className="bg-indigo-50 p-6 rounded-[2rem] mb-6 ring-8 ring-indigo-50/50 shadow-inner text-[var(--accent-primary)]">
              <ShieldCheck className="h-12 w-12" />
            </div>
            <h2 className="text-2xl font-black text-[var(--text-primary)] mb-2 tracking-tight">Review & Submit EOD</h2>
            <p className="text-[var(--text-muted)] font-medium mb-10 max-w-md leading-relaxed">
              Review your daily operational data. The system automatically aggregates logged hours, task statuses, and metrics for your review before submission.
            </p>
            <Button 
              size="lg" 
              onClick={handleGenerate} 
              disabled={isSubmitting}
              className="h-14 bg-[var(--accent-primary)] hover:opacity-90 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl px-12 shadow-xl border-none transition-all active:scale-95"
            >
              {isSubmitting ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : <FileText className="mr-3 h-5 w-5" />}
              Generate EOD Report
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-8 bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-[var(--shadow-soft)] rounded-[2.5rem] gap-6">
            <div className="flex items-center gap-6">
              <div className={cn(
                "p-5 rounded-[1.5rem] shadow-inner",
                eod.status === 'Approved' ? "bg-emerald-50 text-emerald-600" :
                eod.status === 'Needs Revision' ? "bg-rose-50 text-rose-600" :
                eod.status === 'Pending Approval' ? "bg-amber-50 text-amber-600" : "bg-indigo-50 text-[var(--accent-primary)]"
              )}>
                <ShieldCheck className="h-8 w-8" />
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-[0.2em] mb-1">Status</p>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tighter">{eod.status}</h2>
                  {eod.status === 'Needs Revision' && <Badge className="bg-rose-500 text-white border-none font-black text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-lg">Action Required</Badge>}
                </div>
              </div>
            </div>
            
            {(eod.status === 'Generated' || eod.status === 'Needs Revision') && (
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting} 
                className="h-14 bg-[var(--accent-primary)] hover:opacity-90 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl px-10 shadow-xl border-none transition-all active:scale-95"
              >
                {isSubmitting ? <Loader2 className="mr-3 h-4 w-4 animate-spin" /> : <Send className="mr-3 h-4 w-4" />}
                Submit EOD
              </Button>
            )}
          </div>

          {eod.manager_comments && (
            <Card className="border border-[var(--status-danger-border)] shadow-[var(--shadow-soft)] bg-[var(--status-danger-bg)] rounded-[2.5rem] overflow-hidden text-[var(--status-danger-text)]">
              <CardHeader className="px-10 pt-10 pb-4">
                <CardTitle className="text-xs font-black text-[var(--status-danger-text)] flex items-center gap-2 uppercase tracking-widest">
                  <AlertCircle className="h-4 w-4" /> Manager Feedback
                </CardTitle>
              </CardHeader>
              <CardContent className="px-10 pb-10">
                <p className="text-sm text-[var(--status-danger-text)] font-bold leading-relaxed italic">"{eod.manager_comments}"</p>
                {eod.status === 'Needs Revision' && (
                  <Button variant="outline" size="sm" onClick={handleGenerate} className="mt-6 h-10 bg-[var(--bg-surface)] border-[var(--status-danger-border)] text-[var(--status-danger-text)] font-black text-[10px] uppercase tracking-widest rounded-xl px-6 hover:bg-[var(--status-danger-bg)] transition-all">
                    Regenerate EOD
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-8 md:grid-cols-2">
            <Card className="border-none shadow-[var(--shadow-soft)] bg-[var(--bg-surface)] rounded-[2.5rem] overflow-hidden">
              <CardHeader className="px-10 pt-10 pb-4 border-b border-[var(--border-subtle)]">
                <CardTitle className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-3">
                  <Clock className="h-5 w-5 text-[var(--accent-primary)]" /> Attendance Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-10">
                <div className="space-y-5">
                  <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-4">
                    <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Report Date</span>
                    <span className="text-sm font-black text-[var(--text-primary)] uppercase">{eod.date}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-4">
                    <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Work Mode</span>
                    <span className="text-sm font-black text-[var(--accent-primary)] uppercase tracking-tighter">{eod.work_mode}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-4">
                    <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Check-in Time</span>
                    <span className="text-sm font-black text-[var(--text-primary)]">{eod.login_time}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-4">
                    <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Check-out Time</span>
                    <span className="text-sm font-black text-[var(--text-primary)]">{eod.logout_time || 'Active Session'}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tighter">Total Tracked Hours</span>
                    <span className="text-2xl font-black text-[var(--accent-primary)] tracking-tighter font-mono">{eod.total_hours}h</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-[var(--shadow-soft)] bg-[var(--bg-surface)] rounded-[2.5rem] overflow-hidden">
              <CardHeader className="px-10 pt-10 pb-4 border-b border-[var(--border-subtle)]">
                <CardTitle className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-3">
                  <CheckSquare className="h-5 w-5 text-[var(--accent-primary)]" /> Task Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="p-10">
                <div className="space-y-5">
                  <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-4">
                    <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Tasks Worked On</span>
                    <span className="text-sm font-black text-[var(--text-primary)]">{eod.tasks_worked_on}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-4">
                    <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Tasks Completed</span>
                    <span className="text-sm font-black text-emerald-600">{eod.completed_tasks}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-4">
                    <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Tasks Pending</span>
                    <span className="text-sm font-black text-amber-600">{eod.pending_tasks}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-4">
                    <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Blocked Tasks</span>
                    <span className="text-sm font-black text-rose-600">{eod.blocked_tasks}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tighter">Key Actions</span>
                    <span className="text-2xl font-black text-[var(--accent-primary)] tracking-tighter font-mono">{eod.duties_performed}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-[var(--shadow-soft)] bg-[var(--bg-elevated)] text-white rounded-[3rem] overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-12 opacity-10 transition-transform group-hover:scale-110 duration-700">
                <ShieldCheck className="h-48 w-48 rotate-12" />
            </div>
            <CardContent className="p-12 relative z-10">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                  <div className="bg-indigo-600 p-5 rounded-[1.5rem] border border-indigo-500 shadow-xl ring-4 ring-indigo-500/20">
                    <Briefcase className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-[0.2em] mb-1">Productivity Index</p>
                    <p className="text-5xl font-black tracking-tighter text-white">{eod.productivity_score}<span className="text-lg text-[var(--text-muted)] font-black ml-1 uppercase">/100</span></p>
                  </div>
                </div>
                <div className="text-center md:text-right">
                  <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-[0.2em] mb-1">Status</p>
                  <p className="text-lg font-black text-indigo-400 uppercase tracking-widest">{eod.status}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
