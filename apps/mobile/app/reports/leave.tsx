import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../../src/components/ui/Screen';
import { ManageScreenHeader } from '../../src/components/manage/ManageScreenHeader';
import { ReportDateRangePicker } from '../../src/components/reports/ReportDateRangePicker';
import { ReportMetricGrid } from '../../src/components/reports/ReportMetricGrid';
import { ReportSummaryCard } from '../../src/components/reports/ReportSummaryCard';
import { LeaveBreakdownChart } from '../../src/components/reports/SimpleBarChart';
import { ReportEmptyState } from '../../src/components/reports/ReportEmptyState';
import { AppBadge } from '../../src/components/ui/AppBadge';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { LoadingState } from '../../src/components/ui/LoadingState';
import { getEmployeeReport } from '../../src/api/reports.api';
import { getMyLeaveRequests } from '../../src/api/leave.api';
import { getErrorMessage, isForbiddenError } from '../../src/api/client';
import { queryKeys } from '../../src/constants/query-keys';
import { getReportDateRange, type ReportDatePreset } from '../../src/utils/report-dates';
import { formatLeaveType } from '../../src/utils/manage';
import { colors, radii, spacing } from '../../src/constants/theme';
import type { LeaveRequest } from '../../src/types/approvals';

export default function LeaveReportScreen() {
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

  const leavesQuery = useQuery({
    queryKey: queryKeys.myLeaves,
    queryFn: getMyLeaveRequests,
  });

  const leaveStats = useMemo(() => {
    const requests = leavesQuery.data ?? [];
    const countByType = (type: LeaveRequest['leave_type']) =>
      requests.filter((item) => item.leave_type === type).length;
    const countByStatus = (status: string) =>
      requests.filter((item) => item.status === status).length;

    return {
      sick: countByType('sick'),
      casual: countByType('casual'),
      annual: countByType('annual'),
      wfh: countByType('wfh'),
      pending: countByStatus('pending'),
      approved: countByStatus('approved'),
      rejected: countByStatus('rejected'),
    };
  }, [leavesQuery.data]);

  return (
    <Screen headerSafeArea scroll={false}>
      <ManageScreenHeader title="My Leave Summary" subtitle={range.label} showBack />
      {(reportQuery.isLoading || leavesQuery.isLoading) ? (
        <LoadingState message="Loading leave summary…" />
      ) : null}
      {(reportQuery.isError || leavesQuery.isError) ? (
        <ErrorState
          message={
            isForbiddenError(reportQuery.error ?? leavesQuery.error)
              ? 'You do not have access to this leave summary.'
              : getErrorMessage(reportQuery.error ?? leavesQuery.error, 'Unable to load leave summary.')
          }
          onRetry={() => {
            void reportQuery.refetch();
            void leavesQuery.refetch();
          }}
        />
      ) : null}
      {!reportQuery.isLoading && !leavesQuery.isLoading && !reportQuery.isError && !leavesQuery.isError ? (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={reportQuery.isRefetching || leavesQuery.isRefetching}
              onRefresh={() => {
                void reportQuery.refetch();
                void leavesQuery.refetch();
              }}
            />
          }
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ReportDateRangePicker selected={preset} onSelect={setPreset} />
          <ReportMetricGrid>
            <ReportSummaryCard title="WFH Days" value={reportQuery.data?.wfh_days ?? 0} accentColor={colors.info} />
            <ReportSummaryCard title="Absences" value={reportQuery.data?.absences ?? 0} accentColor={colors.danger} />
            <ReportSummaryCard title="Pending" value={leaveStats.pending} accentColor={colors.warning} />
            <ReportSummaryCard title="Approved" value={leaveStats.approved} accentColor={colors.success} />
            <ReportSummaryCard title="Rejected" value={leaveStats.rejected} accentColor={colors.danger} />
          </ReportMetricGrid>
          <LeaveBreakdownChart
            sick={leaveStats.sick}
            casual={leaveStats.casual}
            annual={leaveStats.annual}
            wfh={leaveStats.wfh}
          />
          <Text style={styles.sectionTitle}>Recent Requests</Text>
          {(leavesQuery.data ?? []).length === 0 ? (
            <ReportEmptyState title="No leave requests" description="Your leave and WFH requests will appear here." />
          ) : (
            (leavesQuery.data ?? []).slice(0, 10).map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <Text style={styles.requestTitle}>{formatLeaveType(request.leave_type)}</Text>
                  <AppBadge label={request.status.replace(/_/g, ' ')} variant={statusVariant(request.status)} />
                </View>
                <Text style={styles.requestDates}>
                  {request.start_date} → {request.end_date}
                </Text>
                {request.reason ? <Text style={styles.requestReason}>{request.reason}</Text> : null}
              </View>
            ))
          )}
        </ScrollView>
      ) : null}
    </Screen>
  );
}

function statusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'approved') return 'success';
  if (status === 'pending' || status === 'needs_clarification') return 'warning';
  if (status === 'rejected') return 'danger';
  return 'neutral';
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  requestCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  requestTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  requestDates: {
    marginTop: 4,
    fontSize: 13,
    color: colors.mutedText,
  },
  requestReason: {
    marginTop: 6,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
});
