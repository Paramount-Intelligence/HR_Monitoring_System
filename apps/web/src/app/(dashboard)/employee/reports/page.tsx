'use client';

import { useEffect, useState, useMemo } from 'react';
import { reportsApi, ReportSummary } from '@/lib/api/reports';
import { Button } from '@/components/ui/button';
import { format, startOfWeek, endOfWeek, subWeeks, startOfMonth } from 'date-fns';
import { toast } from 'sonner';
import { Loader2, Calendar, Clock, AlertCircle, Download, TrendingUp } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { EmployeePageShell } from '@/components/employee/EmployeePageShell';
import { EmployeePageHeader } from '@/components/employee/EmployeePageHeader';
import { EmployeeMetricGrid } from '@/components/employee/EmployeeMetricGrid';
import { EmployeeMetricCard } from '@/components/employee/EmployeeMetricCard';
import { EmployeeSectionCard } from '@/components/employee/EmployeeSectionCard';
import { Skeleton } from '@/components/ui/skeletons';

export default function EmployeeReportsPage() {
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<'this_week' | 'last_week' | 'this_month'>('this_week');

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      let start: Date, end: Date;
      const now = new Date();

      if (period === 'this_week') {
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = now;
      } else if (period === 'last_week') {
        const lastWeek = subWeeks(now, 1);
        start = startOfWeek(lastWeek, { weekStartsOn: 1 });
        end = endOfWeek(lastWeek, { weekStartsOn: 1 });
      } else {
        start = startOfMonth(now);
        end = now;
      }

      const data = await reportsApi.getEmployeeReport(
        format(start, 'yyyy-MM-dd'),
        format(end, 'yyyy-MM-dd')
      );
      setReport(data);
    } catch {
      toast.error('Failed to load performance report');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [period]);

  const hoursWorked = useMemo(() => {
    const h = Number(report?.total_hours);
    return Number.isFinite(h) ? h.toFixed(1) : '0.0';
  }, [report]);

  const periodLabel =
    period === 'this_week' ? 'This Week' : period === 'last_week' ? 'Last Week' : 'This Month';

  return (
    <EmployeePageShell>
      <EmployeePageHeader
        title="My Reports"
        subtitle="Attendance and productivity metrics for the selected period"
        icon={TrendingUp}
        actions={
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={(val: 'this_week' | 'last_week' | 'this_month') => setPeriod(val)}>
              <SelectTrigger className="w-[140px] h-9 rounded-lg text-xs">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="last_week">Last Week</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg" disabled title="Export coming soon">
              <Download className="h-3.5 w-3.5" />
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-48 rounded-xl" />
        </>
      ) : report ? (
        <>
          <EmployeeMetricGrid>
            <EmployeeMetricCard title="Hours Worked" value={`${hoursWorked}h`} icon={Clock} subtitle={periodLabel} />
            <EmployeeMetricCard title="Late Logins" value={report.late_logins ?? 0} icon={AlertCircle} />
            <EmployeeMetricCard title="WFH Days" value={report.wfh_days ?? 0} icon={Calendar} />
            <EmployeeMetricCard title="Absences" value={report.absences ?? 0} icon={AlertCircle} />
          </EmployeeMetricGrid>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EmployeeSectionCard title="Period Summary" icon={Calendar}>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                  <span className="text-[var(--text-muted)]">Reporting period</span>
                  <span className="font-medium">{periodLabel}</span>
                </div>
                <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                  <span className="text-[var(--text-muted)]">From</span>
                  <span className="font-medium">{report.start_date || '—'}</span>
                </div>
                <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                  <span className="text-[var(--text-muted)]">To</span>
                  <span className="font-medium">{report.end_date || '—'}</span>
                </div>
                <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                  <span className="text-[var(--text-muted)]">Early check-outs</span>
                  <span className="font-medium">{report.early_logouts ?? 0}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="font-medium">Total hours</span>
                  <span className="font-bold text-[var(--accent-primary)]">{hoursWorked}h</span>
                </div>
              </div>
            </EmployeeSectionCard>

            <EmployeeSectionCard title="Observations" icon={TrendingUp}>
              <div className="space-y-3">
                {report.late_logins > 0 ? (
                  <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Late logins detected</p>
                      <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                        {report.late_logins} late login{report.late_logins === 1 ? '' : 's'} in this period.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">Strong punctuality</p>
                      <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
                        No late logins recorded for {periodLabel.toLowerCase()}.
                      </p>
                    </div>
                  </div>
                )}

                {report.early_logouts > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-lg">
                    <Clock className="h-4 w-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold">Early check-outs</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        {report.early_logouts} early check-out{report.early_logouts === 1 ? '' : 's'} logged.
                      </p>
                    </div>
                  </div>
                )}

                {report.absences > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-rose-900 dark:text-rose-200">Absences recorded</p>
                      <p className="text-xs text-rose-800/80 dark:text-rose-300/80 mt-0.5">
                        {report.absences} absence{report.absences === 1 ? '' : 's'} in this period.
                      </p>
                    </div>
                  </div>
                )}

                {report.wfh_days > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-lg">
                    <Calendar className="h-4 w-4 text-[var(--accent-primary)] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold">Remote work</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        {report.wfh_days} approved WFH day{report.wfh_days === 1 ? '' : 's'}.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </EmployeeSectionCard>
          </div>
        </>
      ) : (
        <EmptyState
          title="No report data"
          description="No data found for the selected period. Try a different range."
          icon={TrendingUp}
          action={
            <Button size="sm" className="rounded-lg" onClick={fetchReport}>
              {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Retry'}
            </Button>
          }
        />
      )}
    </EmployeePageShell>
  );
}
