'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { eodApi, EODReport } from '@/lib/api/eod';
import { usersApi } from '@/lib/api/users';
import { getErrorMessage } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck, FileText, Send, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatPKDateTime } from '@/lib/time';
import { EmployeePageHeader } from '@/components/employee/EmployeePageHeader';
import { EmployeePageShell } from '@/components/employee/EmployeePageShell';
import { EmployeeSectionCard } from '@/components/employee/EmployeeSectionCard';
import { ManagerPageShell } from '@/components/manager/ManagerPageShell';
import { ManagerPageHeader } from '@/components/manager/ManagerPageHeader';
import { EodMetricCards } from '@/components/eod/EodMetricCards';
import { EodAttendanceSummary } from '@/components/eod/EodAttendanceSummary';
import { EodTaskMetrics } from '@/components/eod/EodTaskMetrics';
import { EodShiftWorkDetails } from '@/components/eod/EodShiftWorkDetails';
import { ReportingManagerNotice } from '@/components/eod/ReportingManagerNotice';
import {
  buildInitialFormState,
  canSubmitEod,
  displayEodStatus,
  validateWorkSummary,
} from '@/lib/eod/eod-form';
import { managerEodSubtitle, reportingManagerLabel } from '@/lib/eod/manager-eod';
import { cleanReason } from '@/lib/utils';

type EodRoleContext = 'employee' | 'manager';

interface MyEodPageProps {
  roleContext: EodRoleContext;
}

export function MyEodPage({ roleContext }: MyEodPageProps) {
  const [eod, setEod] = useState<EODReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [workSummary, setWorkSummary] = useState('');
  const [blockers, setBlockers] = useState('');
  const [nextDayPlan, setNextDayPlan] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [reportingManagerName, setReportingManagerName] = useState<string | null>(null);
  const submitLockRef = useRef(false);

  const loadReportingManager = useCallback(async () => {
    if (roleContext !== 'manager') return;
    try {
      const profile = await usersApi.getMe();
      setReportingManagerName(reportingManagerLabel(profile.manager_name));
    } catch {
      setReportingManagerName(null);
    }
  }, [roleContext]);

  const loadEOD = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await eodApi.getMyTodayEod();
      setEod(data);
      const initial = buildInitialFormState(data);
      setWorkSummary(initial.workSummary);
      setBlockers(initial.blockers);
      setNextDayPlan(initial.nextDayPlan);
    } catch {
      toast.error('Failed to load EOD status');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEOD();
    void loadReportingManager();
  }, [loadEOD, loadReportingManager]);

  useEffect(() => {
    const handleRefresh = () => {
      void loadEOD();
    };
    window.addEventListener('pims-eod-refresh', handleRefresh);
    return () => window.removeEventListener('pims-eod-refresh', handleRefresh);
  }, [loadEOD]);

  useEffect(() => {
    if (!eod || !['Generated', 'Draft', 'Needs Revision'].includes(eod.status)) return;
    const interval = window.setInterval(() => {
      void eodApi.generateMyEOD().then((fresh) => setEod(fresh)).catch(() => undefined);
    }, 60000);
    return () => window.clearInterval(interval);
  }, [eod?.status, eod?.date]);

  async function handleGenerate() {
    try {
      setIsGenerating(true);
      const generated = await eodApi.generateMyEOD();
      setEod(generated);
      toast.success('EOD metrics generated successfully');
    } catch (error) {
      toast.error(getErrorMessage(error) || 'Failed to generate EOD');
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSubmit() {
    const error = validateWorkSummary(workSummary);
    if (error) {
      setValidationError(error);
      toast.error(error);
      return;
    }
    if (submitLockRef.current || isSubmitting) return;

    submitLockRef.current = true;
    setValidationError(null);
    setIsSubmitting(true);
    try {
      const submitted = await eodApi.submitMyEod({
        report_date: eod?.date,
        work_summary: workSummary.trim(),
        blockers: blockers.trim() || undefined,
        next_day_plan: nextDayPlan.trim() || undefined,
      });
      setEod(submitted);
      setWorkSummary(submitted.work_summary ?? workSummary.trim());
      setBlockers(submitted.blockers ?? '');
      setNextDayPlan(submitted.next_day_plan ?? '');
      toast.success('EOD submitted successfully');
    } catch (error) {
      toast.error(getErrorMessage(error) || 'Failed to submit EOD');
    } finally {
      setIsSubmitting(false);
      submitLockRef.current = false;
    }
  }

  const shellContent = (() => {
    if (isLoading) {
      return (
        <div className="flex h-64 items-center justify-center text-[var(--text-muted)]">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
        </div>
      );
    }

    const submitAction =
      (!eod || canSubmitEod(eod.status)) ? (
        <Button size="sm" onClick={() => void handleSubmit()} disabled={isSubmitting} className="rounded-lg">
          {isSubmitting ? (
            <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
          ) : (
            <Send className="mr-1.5 h-3 w-3" />
          )}
          {isSubmitting ? 'Submitting…' : 'Submit EOD'}
        </Button>
      ) : undefined;

    return (
      <>
        {roleContext === 'manager' ? (
          <ReportingManagerNotice managerName={reportingManagerName} />
        ) : null}

        {!eod ? (
          <>
            <EmployeeSectionCard title="Generate Report" icon={FileText}>
              <div className="text-center py-6">
                <p className="app-copy mb-4 max-w-md mx-auto">
                  Generate your daily metrics, write your work summary below, then submit your EOD
                  report.
                </p>
                <Button size="sm" onClick={() => void handleGenerate()} disabled={isGenerating} className="rounded-lg">
                  {isGenerating ? (
                    <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  ) : (
                    <FileText className="mr-1.5 h-3 w-3" />
                  )}
                  Generate EOD Report
                </Button>
              </div>
            </EmployeeSectionCard>

            <EodSummaryForm
              eod={null}
              workSummary={workSummary}
              blockers={blockers}
              nextDayPlan={nextDayPlan}
              onWorkSummaryChange={setWorkSummary}
              onBlockersChange={setBlockers}
              onNextDayPlanChange={setNextDayPlan}
              validationError={validationError}
              disabled={isSubmitting}
            />
          </>
        ) : (
          <>
            <EodMetricCards eod={eod} />

            {eod.submitted_at && (
              <p className="text-xs text-[var(--text-muted)]">
                Submitted {formatPKDateTime(eod.submitted_at)}
              </p>
            )}

            {eod.manager_comments && (
              <EmployeeSectionCard title="Manager Feedback" icon={AlertCircle}>
                <p className="text-sm text-[var(--status-danger-text)] leading-relaxed">
                  {cleanReason(eod.manager_comments)}
                </p>
                {eod.status === 'Needs Revision' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleGenerate()}
                    disabled={isGenerating}
                    className="mt-4 rounded-lg"
                  >
                    Regenerate Metrics
                  </Button>
                )}
              </EmployeeSectionCard>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <EodAttendanceSummary eod={eod} />
              <EodTaskMetrics eod={eod} />
            </div>

            <EodShiftWorkDetails eod={eod} />

            <EodSummaryForm
              eod={eod}
              workSummary={workSummary}
              blockers={blockers}
              nextDayPlan={nextDayPlan}
              onWorkSummaryChange={setWorkSummary}
              onBlockersChange={setBlockers}
              onNextDayPlanChange={setNextDayPlan}
              validationError={validationError}
              disabled={isSubmitting}
            />

            {!canSubmitEod(eod.status) && (
              <p className="text-xs text-[var(--text-muted)]">
                Current status: {displayEodStatus(eod.status)}. Editing is locked until revision is
                requested.
              </p>
            )}
          </>
        )}
      </>
    );
  })();

  if (roleContext === 'manager') {
    return (
      <ManagerPageShell>
        <ManagerPageHeader
          title="My EOD"
          subtitle={managerEodSubtitle(Boolean(reportingManagerName))}
          icon={ShieldCheck}
          actions={
            (!eod || canSubmitEod(eod.status)) ? (
              <Button size="sm" onClick={() => void handleSubmit()} disabled={isSubmitting} className="rounded-lg">
                {isSubmitting ? (
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                ) : (
                  <Send className="mr-1.5 h-3 w-3" />
                )}
                {isSubmitting ? 'Submitting…' : 'Submit EOD'}
              </Button>
            ) : undefined
          }
        />
        {shellContent}
      </ManagerPageShell>
    );
  }

  return (
    <EmployeePageShell>
      <EmployeePageHeader
        title="My EOD"
        subtitle="Daily report, productivity, blockers, and manager feedback"
        icon={ShieldCheck}
        actions={
          (!eod || canSubmitEod(eod.status)) ? (
            <Button size="sm" onClick={() => void handleSubmit()} disabled={isSubmitting} className="rounded-lg">
              {isSubmitting ? (
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
              ) : (
                <Send className="mr-1.5 h-3 w-3" />
              )}
              {isSubmitting ? 'Submitting…' : 'Submit EOD'}
            </Button>
          ) : undefined
        }
      />
      {shellContent}
    </EmployeePageShell>
  );
}
