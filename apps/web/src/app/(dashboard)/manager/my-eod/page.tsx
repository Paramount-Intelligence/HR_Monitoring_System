'use client';

import { useState, useEffect } from 'react';
import { eodApi, EODReport } from '@/lib/api/eod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck, Clock, CheckSquare, Briefcase, FileText, Send } from 'lucide-react';
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
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 text-[var(--text-primary)]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">My EOD Reports</h1>
          <p className="text-sm text-[var(--text-secondary)]">Review and submit your end-of-day progress report</p>
        </div>
      </div>

      {!eod ? (
        <Card className="shadow-[var(--shadow-soft)] border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 text-center py-16 text-[var(--text-primary)]">
          <CardContent className="flex flex-col items-center">
            <div className="bg-[var(--bg-subtle)] p-4 rounded-full mb-4 border border-[var(--border-subtle)]">
              <ShieldCheck className="h-10 w-10 text-[var(--accent-primary)]" />
            </div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Submit EOD Report</h2>
            <p className="text-[var(--text-secondary)] mb-8 max-w-md">
              Generate your EOD report automatically compiling your hours, tasks, and actions.
            </p>
            <Button 
              size="lg" 
              onClick={handleGenerate} 
              disabled={isSubmitting}
              className="bg-[var(--accent-primary)] hover:opacity-90 border-none text-white shadow-sm"
            >
              {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin text-white" /> : <FileText className="mr-2 h-5 w-5 text-white" />}
              Generate EOD Report
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm rounded-xl">
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-3 rounded-full border",
                eod.status === 'Approved' ? "bg-emerald-50 border-emerald-100" :
                eod.status === 'Needs Revision' ? "bg-rose-50 border-rose-100" :
                eod.status === 'Pending Approval' ? "bg-amber-50 border-amber-100" : "bg-blue-50 border-blue-100"
              )}>
                <ShieldCheck className={cn(
                  "h-6 w-6",
                  eod.status === 'Approved' ? "text-emerald-600" :
                  eod.status === 'Needs Revision' ? "text-rose-600" :
                  eod.status === 'Pending Approval' ? "text-amber-600" : "text-blue-600"
                )} />
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)] font-medium">Status</p>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[var(--text-primary)]">{eod.status}</h2>
                  {eod.status === 'Needs Revision' && <Badge variant="destructive">Action Required</Badge>}
                </div>
              </div>
            </div>
            
            {(eod.status === 'Generated' || eod.status === 'Needs Revision') && (
              <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-[var(--accent-primary)] hover:opacity-90 border-none text-white shadow-sm">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" /> : <Send className="mr-2 h-4 w-4 text-white" />}
                Submit EOD
              </Button>
            )}
          </div>

          {eod.manager_comments && (
            <Card className="shadow-sm border-rose-200 bg-rose-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-rose-800 flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Manager Feedback
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-rose-900 leading-relaxed">{eod.manager_comments}</p>
                {eod.status === 'Needs Revision' && (
                  <Button variant="outline" size="sm" onClick={handleGenerate} className="mt-4 bg-white">
                    Regenerate Report
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="shadow-[var(--shadow-soft)] border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)]">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[var(--text-muted)]" /> Attendance & Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                    <span className="text-sm text-[var(--text-muted)]">Date</span>
                    <span className="text-sm font-medium">{eod.date}</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                    <span className="text-sm text-[var(--text-muted)]">Work Mode</span>
                    <span className="text-sm font-medium uppercase">{eod.work_mode}</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                    <span className="text-sm text-[var(--text-muted)]">Login Time</span>
                    <span className="text-sm font-medium">{eod.login_time}</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                    <span className="text-sm text-[var(--text-muted)]">Logout Time</span>
                    <span className="text-sm font-medium">{eod.logout_time || 'Pending'}</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">Total Tracked Hours</span>
                    <span className="text-sm font-bold text-[var(--accent-primary)]">{eod.total_hours}h</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-[var(--shadow-soft)] border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)]">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-[var(--text-muted)]" /> Tasks & Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                    <span className="text-sm text-[var(--text-muted)]">Total Tasks Worked On</span>
                    <span className="text-sm font-medium">{eod.tasks_worked_on}</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                    <span className="text-sm text-[var(--text-muted)]">Tasks Completed</span>
                    <span className="text-sm font-medium text-emerald-600">{eod.completed_tasks}</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                    <span className="text-sm text-[var(--text-muted)]">Tasks Pending</span>
                    <span className="text-sm font-medium text-amber-600">{eod.pending_tasks}</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                    <span className="text-sm text-[var(--text-muted)]">Blocked Items</span>
                    <span className="text-sm font-medium text-rose-600">{eod.blocked_tasks}</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">Actions Performed</span>
                    <span className="text-sm font-bold text-[var(--accent-primary)]">{eod.duties_performed}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-[var(--shadow-soft)] bg-[var(--bg-subtle)] text-[var(--text-primary)] border border-[var(--border-subtle)]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-[var(--accent-primary)] p-3 rounded-xl border-none">
                    <Briefcase className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-muted)] font-medium">Productivity Score</p>
                    <p className="text-2xl font-bold">{eod.productivity_score}/100</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-[var(--text-muted)]">Status</p>
                  <p className="font-medium text-[var(--accent-primary)]">{eod.status}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
