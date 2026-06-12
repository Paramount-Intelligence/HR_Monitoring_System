import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../../src/components/ui/Screen';
import { ManageScreenHeader } from '../../src/components/manage/ManageScreenHeader';
import { EmptyAccessState } from '../../src/components/manage/EmptyAccessState';
import { ReportDateRangePicker } from '../../src/components/reports/ReportDateRangePicker';
import { ReportMetricGrid } from '../../src/components/reports/ReportMetricGrid';
import { ReportSummaryCard } from '../../src/components/reports/ReportSummaryCard';
import { ReportEmptyState } from '../../src/components/reports/ReportEmptyState';
import { AttendanceTrendChart, SimpleBarChart } from '../../src/components/reports/SimpleBarChart';
import { ExceptionHeatmapMobile } from '../../src/components/reports/ExceptionHeatmapMobile';
import { TeamMemberPerformanceCard } from '../../src/components/team/TeamMemberPerformanceCard';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { LoadingState } from '../../src/components/ui/LoadingState';
import {
  getAdminAnalytics,
  getAdminWorkforceReport,
  getWorkforceReport,
} from '../../src/api/reports.api';
import { getErrorMessage, isForbiddenError } from '../../src/api/client';
import { queryKeys } from '../../src/constants/query-keys';
import { getReportDateRange, type ReportDatePreset } from '../../src/utils/report-dates';
import {
  canAccessAdminReports,
  canAccessWorkforceReports,
  normalizeRole,
} from '../../src/utils/role';
import { useAuthStore } from '../../src/auth/auth-store';
import { colors, spacing } from '../../src/constants/theme';

export default function WorkforceReportScreen() {
  const user = useAuthStore((s) => s.user);
  const role = normalizeRole(user?.role);
  const [preset, setPreset] = useState<ReportDatePreset>('month');
  const range = useMemo(() => getReportDateRange(preset), [preset]);

  const workforceQuery = useQuery({
    queryKey: queryKeys.reportsWorkforce(
      { start_date: range.start_date, end_date: range.end_date },
      role
    ),
    queryFn: () =>
      canAccessAdminReports(role)
        ? getAdminWorkforceReport({ start_date: range.start_date, end_date: range.end_date })
        : getWorkforceReport({ start_date: range.start_date, end_date: range.end_date }),
    enabled: canAccessWorkforceReports(role),
  });

  const adminAnalyticsQuery = useQuery({
    queryKey: queryKeys.reportsAdminAnalytics,
    queryFn: getAdminAnalytics,
    enabled: canAccessAdminReports(role),
  });

  const totals = useMemo(() => {
    const rows = workforceQuery.data ?? [];
    return {
      employees: rows.length,
      hours: rows.reduce((sum, row) => sum + row.total_hours, 0),
      late: rows.reduce((sum, row) => sum + row.late_logins, 0),
      early: rows.reduce((sum, row) => sum + row.early_logouts, 0),
      absences: rows.reduce((sum, row) => sum + row.absences, 0),
      wfh: rows.reduce((sum, row) => sum + row.wfh_days, 0),
    };
  }, [workforceQuery.data]);

  const exceptionRows = useMemo(() => {
    return [...(workforceQuery.data ?? [])]
      .map((row) => ({
        ...row,
        exceptions: row.late_logins + row.early_logouts + row.absences,
      }))
      .filter((row) => row.exceptions > 0)
      .sort((a, b) => b.exceptions - a.exceptions)
      .slice(0, 10);
  }, [workforceQuery.data]);

  if (!canAccessWorkforceReports(role)) {
    return (
      <Screen scroll={false}>
        <ManageScreenHeader title="Workforce Reports" subtitle="Org-wide analytics" showBack />
        <EmptyAccessState message="Workforce reports are available to Admin and HR only." />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <ManageScreenHeader
        title={canAccessAdminReports(role) ? 'Workforce Summary' : 'Workforce Attendance'}
        subtitle={range.label}
        showBack
      />
      <ReportDateRangePicker selected={preset} onSelect={setPreset} />
      {workforceQuery.isLoading ? <LoadingState message="Loading workforce report…" /> : null}
      {workforceQuery.isError ? (
        <ErrorState
          message={
            isForbiddenError(workforceQuery.error)
              ? 'You do not have access to workforce reports.'
              : getErrorMessage(workforceQuery.error, 'Unable to load workforce report.')
          }
          onRetry={() => void workforceQuery.refetch()}
        />
      ) : null}
      {!workforceQuery.isLoading && !workforceQuery.isError ? (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={workforceQuery.isRefetching}
              onRefresh={() => {
                void workforceQuery.refetch();
                void adminAnalyticsQuery.refetch();
              }}
            />
          }
        >
          <ReportMetricGrid>
            <ReportSummaryCard title="Employees" value={totals.employees} accentColor={colors.primary} />
            <ReportSummaryCard title="Total Hours" value={`${totals.hours.toFixed(0)}h`} accentColor={colors.success} />
            <ReportSummaryCard title="Late Logins" value={totals.late} accentColor={colors.warning} />
            <ReportSummaryCard title="Early Logouts" value={totals.early} accentColor={colors.warning} />
            <ReportSummaryCard title="Absences" value={totals.absences} accentColor={colors.danger} />
            <ReportSummaryCard title="WFH Days" value={totals.wfh} accentColor={colors.info} />
          </ReportMetricGrid>
          {adminAnalyticsQuery.data ? (
            <>
              <AttendanceTrendChart
                title="Attendance Trend"
                items={adminAnalyticsQuery.data.attendance_trend}
              />
              <SimpleBarChart
                title="Department Comparison"
                items={adminAnalyticsQuery.data.department_comparison.map((dept) => ({
                  label: dept.department_name,
                  value: Math.round(dept.attendance_rate),
                  color: colors.primary,
                }))}
              />
              <ExceptionHeatmapMobile items={adminAnalyticsQuery.data.people_exceptions ?? []} />
            </>
          ) : null}
          <Text style={styles.sectionTitle}>Attendance Exceptions</Text>
          {exceptionRows.length === 0 ? (
            <ReportEmptyState title="No exceptions" description="No late, early, or absence flags in this period." />
          ) : (
            exceptionRows.map((row) => <TeamMemberPerformanceCard key={row.user_id} member={row} />)
          )}
        </ScrollView>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
});
