import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../../src/components/ui/Screen';
import { ManageScreenHeader } from '../../src/components/manage/ManageScreenHeader';
import { ReportDateRangePicker } from '../../src/components/reports/ReportDateRangePicker';
import { ReportMetricGrid } from '../../src/components/reports/ReportMetricGrid';
import { ReportSummaryCard } from '../../src/components/reports/ReportSummaryCard';
import { ReportEmptyState } from '../../src/components/reports/ReportEmptyState';
import { SimpleBarChart } from '../../src/components/reports/SimpleBarChart';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { LoadingState } from '../../src/components/ui/LoadingState';
import { getEmployeeReport } from '../../src/api/reports.api';
import { getErrorMessage, isForbiddenError } from '../../src/api/client';
import { queryKeys } from '../../src/constants/query-keys';
import { getReportDateRange, type ReportDatePreset } from '../../src/utils/report-dates';
import { colors, spacing } from '../../src/constants/theme';

export default function EmployeeReportScreen() {
  const [preset, setPreset] = useState<ReportDatePreset>('month');
  const range = useMemo(() => getReportDateRange(preset), [preset]);

  const reportQuery = useQuery({
    queryKey: queryKeys.reportsEmployee({
      start_date: range.start_date,
      end_date: range.end_date,
    }),
    queryFn: () =>
      getEmployeeReport({ start_date: range.start_date, end_date: range.end_date }),
  });

  const report = reportQuery.data;
  const workingDaysEstimate = Math.max(
    Math.round((report?.total_hours ?? 0) / 8),
    report?.absences != null ? report.absences + 1 : 0
  );

  return (
    <Screen scroll={false}>
      <ManageScreenHeader title="My Attendance Report" subtitle={range.label} showBack />
      <ReportDateRangePicker selected={preset} onSelect={setPreset} />
      {reportQuery.isLoading ? <LoadingState message="Loading report…" /> : null}
      {reportQuery.isError ? (
        <ErrorState
          message={
            isForbiddenError(reportQuery.error)
              ? 'You do not have access to this report.'
              : getErrorMessage(reportQuery.error, 'Unable to load report.')
          }
          onRetry={() => void reportQuery.refetch()}
        />
      ) : null}
      {report ? (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={reportQuery.isRefetching} onRefresh={() => void reportQuery.refetch()} />
          }
        >
          <ReportMetricGrid>
            <ReportSummaryCard title="Total Hours" value={`${report.total_hours.toFixed(1)}h`} accentColor={colors.primary} />
            <ReportSummaryCard title="Avg / Day" value={`${(report.total_hours / Math.max(workingDaysEstimate, 1)).toFixed(1)}h`} accentColor={colors.success} />
            <ReportSummaryCard title="Late Logins" value={report.late_logins} accentColor={colors.warning} />
            <ReportSummaryCard title="Early Logouts" value={report.early_logouts} accentColor={colors.warning} />
            <ReportSummaryCard title="Absences" value={report.absences} accentColor={colors.danger} />
            <ReportSummaryCard title="WFH Days" value={report.wfh_days} accentColor={colors.info} />
          </ReportMetricGrid>
          <SimpleBarChart
            title="Exception Breakdown"
            items={[
              { label: 'Late', value: report.late_logins, color: colors.warning },
              { label: 'Early', value: report.early_logouts, color: colors.warning },
              { label: 'Absent', value: report.absences, color: colors.danger },
              { label: 'WFH', value: report.wfh_days, color: colors.info },
            ]}
          />
          <View style={styles.noteCard}>
            <Text style={styles.noteTitle}>Period</Text>
            <Text style={styles.noteText}>
              {report.start_date} → {report.end_date}
            </Text>
          </View>
        </ScrollView>
      ) : null}
      {!reportQuery.isLoading && !reportQuery.isError && !report ? <ReportEmptyState /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  noteCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  noteTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.mutedText,
  },
  noteText: {
    marginTop: 4,
    fontSize: 15,
    color: colors.text,
  },
});
