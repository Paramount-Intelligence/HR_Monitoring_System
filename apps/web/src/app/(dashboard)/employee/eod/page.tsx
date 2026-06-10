'use client';

import { useState, useEffect } from 'react';
import { eodApi, EODReport } from '@/lib/api/eod';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck, Clock, CheckSquare, FileText, Send, AlertCircle, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { formatPKDateTime } from '@/lib/time';
import { EmployeePageHeader } from '@/components/employee/EmployeePageHeader';
import { EmployeePageShell } from '@/components/employee/EmployeePageShell';
import { EmployeeMetricGrid } from '@/components/employee/EmployeeMetricGrid';
import { EmployeeMetricCard } from '@/components/employee/EmployeeMetricCard';
import { EmployeeSectionCard } from '@/components/employee/EmployeeSectionCard';
import { cleanReason } from '@/lib/utils';

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
      <EmployeePageShell>
        <div className="flex h-64 items-center justify-center text-[var(--text-muted)]">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
        </div>
      </EmployeePageShell>
    );
  }

  const productivityScore = Number.isFinite(Number(eod?.productivity_score))
    ? Math.round(Number(eod?.productivity_score))
    : 0;

  return (
    <EmployeePageShell>
      <EmployeePageHeader
        title="My EOD"
        subtitle="Daily report, productivity, blockers, and manager feedback"
        icon={ShieldCheck}
        actions={
          eod && (eod.status === 'Generated' || eod.status === 'Needs Revision') ? (
            <Button size="sm" onClick={handleSubmit} disabled={isSubmitting} className="rounded-lg">
              {isSubmitting ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Send className="mr-1.5 h-3 w-3" />}
              Submit EOD
            </Button>
          ) : undefined
        }
      />

      {!eod ? (
        <EmployeeSectionCard title="Generate Report" icon={FileText}>
          <div className="text-center py-6">
            <p className="app-copy mb-4 max-w-md mx-auto">
              Review your daily operational data. The system aggregates logged hours, task statuses, and metrics before submission.
            </p>
            <Button size="sm" onClick={handleGenerate} disabled={isSubmitting} className="rounded-lg">
              {isSubmitting ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <FileText className="mr-1.5 h-3 w-3" />}
              Generate EOD Report
            </Button>
          </div>
        </EmployeeSectionCard>
      ) : (
        <>
          <EmployeeMetricGrid>
            <EmployeeMetricCard title="EOD Status" value={eod.status} icon={ShieldCheck} />
            <EmployeeMetricCard title="Productivity" value={`${productivityScore}/100`} icon={TrendingUp} />
            <EmployeeMetricCard title="Completed Tasks" value={eod.completed_tasks ?? 0} icon={CheckSquare} />
            <EmployeeMetricCard title="Logged Hours" value={`${eod.total_hours ?? 0}h`} icon={Clock} />
          </EmployeeMetricGrid>

          {eod.manager_comments && (
            <EmployeeSectionCard title="Manager Feedback" icon={AlertCircle}>
              <p className="text-sm text-[var(--status-danger-text)] leading-relaxed">{cleanReason(eod.manager_comments)}</p>
              {eod.status === 'Needs Revision' && (
                <Button variant="outline" size="sm" onClick={handleGenerate} className="mt-4 rounded-lg">
                  Regenerate EOD
                </Button>
              )}
            </EmployeeSectionCard>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <EmployeeSectionCard title="Attendance Summary" icon={Clock}>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                  <span className="text-[var(--text-muted)]">Report Date</span>
                  <span className="font-medium">{eod.date || '—'}</span>
                </div>
                <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                  <span className="text-[var(--text-muted)]">Work Mode</span>
                  <span className="font-medium">{eod.work_mode || '—'}</span>
                </div>
                <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                  <span className="text-[var(--text-muted)]">Check-in</span>
                  <span className="font-medium">{eod.login_time ? formatPKDateTime(eod.login_time) : '—'}</span>
                </div>
                <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                  <span className="text-[var(--text-muted)]">Check-out</span>
                  <span className="font-medium">{eod.login_time ? (eod.logout_time ? formatPKDateTime(eod.logout_time) : 'Active Session') : '—'}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="font-medium">Total Hours</span>
                  <span className="font-bold text-[var(--accent-primary)]">{eod.total_hours ?? 0}h</span>
                </div>
              </div>
            </EmployeeSectionCard>

            <EmployeeSectionCard title="Task Metrics" icon={CheckSquare}>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                  <span className="text-[var(--text-muted)]">Tasks Worked On</span>
                  <span className="font-medium">{eod.tasks_worked_on ?? 0}</span>
                </div>
                <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                  <span className="text-[var(--text-muted)]">Completed</span>
                  <span className="font-medium text-emerald-600">{eod.completed_tasks ?? 0}</span>
                </div>
                <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                  <span className="text-[var(--text-muted)]">Pending</span>
                  <span className="font-medium text-amber-600">{eod.pending_tasks ?? 0}</span>
                </div>
                <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                  <span className="text-[var(--text-muted)]">Blocked</span>
                  <span className="font-medium text-rose-600">{eod.blocked_tasks ?? 0}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="font-medium">Key Actions</span>
                  <span className="font-bold text-[var(--accent-primary)]">{eod.duties_performed ?? 0}</span>
                </div>
              </div>
            </EmployeeSectionCard>
          </div>
        </>
      )}
    </EmployeePageShell>
  );
}
