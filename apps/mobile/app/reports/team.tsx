import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../../src/components/ui/Screen';
import { ManageScreenHeader } from '../../src/components/manage/ManageScreenHeader';
import { RoleAccessGuard } from '../../src/components/manage/RoleAccessGuard';
import { EmptyAccessState } from '../../src/components/manage/EmptyAccessState';
import { ReportDateRangePicker } from '../../src/components/reports/ReportDateRangePicker';
import { ReportMetricGrid } from '../../src/components/reports/ReportMetricGrid';
import { ReportSummaryCard } from '../../src/components/reports/ReportSummaryCard';
import { ReportEmptyState } from '../../src/components/reports/ReportEmptyState';
import { SimpleBarChart } from '../../src/components/reports/SimpleBarChart';
import { TeamMemberPerformanceCard } from '../../src/components/team/TeamMemberPerformanceCard';
import { TeamSummaryCard } from '../../src/components/team/TeamSummaryCard';
import { TeamWorkloadCard } from '../../src/components/team/TeamWorkloadCard';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { LoadingState } from '../../src/components/ui/LoadingState';
import {
  getBestPerformers,
  getManagerTeamAnalytics,
  getTeamReport,
  getWorkloadBalance,
} from '../../src/api/reports.api';
import { getErrorMessage, isForbiddenError } from '../../src/api/client';
import { queryKeys } from '../../src/constants/query-keys';
import { getReportDateRange, type ReportDatePreset } from '../../src/utils/report-dates';
import { canAccessTeamReports } from '../../src/utils/role';
import { useAuthStore } from '../../src/auth/auth-store';
import { colors, spacing } from '../../src/constants/theme';

export default function TeamReportScreen() {
  const user = useAuthStore((s) => s.user);
  const [preset, setPreset] = useState<ReportDatePreset>('month');
  const range = useMemo(() => getReportDateRange(preset), [preset]);

  const teamReportQuery = useQuery({
    queryKey: queryKeys.reportsTeam({
      start_date: range.start_date,
      end_date: range.end_date,
    }),
    queryFn: () => getTeamReport({ start_date: range.start_date, end_date: range.end_date }),
    enabled: canAccessTeamReports(user?.role),
  });

  const teamAnalyticsQuery = useQuery({
    queryKey: queryKeys.reportsTeamAnalytics,
    queryFn: getManagerTeamAnalytics,
    enabled: canAccessTeamReports(user?.role),
  });

  const performersQuery = useQuery({
    queryKey: queryKeys.reportsBestPerformers,
    queryFn: getBestPerformers,
    enabled: canAccessTeamReports(user?.role),
  });

  const workloadQuery = useQuery({
    queryKey: queryKeys.reportsWorkload,
    queryFn: getWorkloadBalance,
    enabled: canAccessTeamReports(user?.role),
  });

  const totals = useMemo(() => {
    const rows = teamReportQuery.data ?? [];
    return {
      hours: rows.reduce((sum, row) => sum + row.total_hours, 0),
      late: rows.reduce((sum, row) => sum + row.late_logins, 0),
      absences: rows.reduce((sum, row) => sum + row.absences, 0),
      wfh: rows.reduce((sum, row) => sum + row.wfh_days, 0),
    };
  }, [teamReportQuery.data]);

  if (!canAccessTeamReports(user?.role)) {
    return (
      <Screen scroll={false}>
        <ManageScreenHeader title="Team Reports" subtitle="Scoped team analytics" showBack />
        <EmptyAccessState message="Team reports are not available for your role." />
      </Screen>
    );
  }

  return (
    <RoleAccessGuard>
      <Screen scroll={false}>
        <ManageScreenHeader title="Team Reports" subtitle={range.label} showBack />
        {teamReportQuery.isLoading ? <LoadingState message="Loading team report…" /> : null}
        {teamReportQuery.isError ? (
          <ErrorState
            message={
              isForbiddenError(teamReportQuery.error)
                ? 'You do not have access to team reports.'
                : getErrorMessage(teamReportQuery.error, 'Unable to load team report.')
            }
            onRetry={() => void teamReportQuery.refetch()}
          />
        ) : null}
        {!teamReportQuery.isLoading && !teamReportQuery.isError ? (
          <ScrollView
            refreshControl={
              <RefreshControl
                refreshing={teamReportQuery.isRefetching}
                onRefresh={() => {
                  void teamReportQuery.refetch();
                  void teamAnalyticsQuery.refetch();
                  void performersQuery.refetch();
                  void workloadQuery.refetch();
                }}
              />
            }
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <ReportDateRangePicker selected={preset} onSelect={setPreset} />
            {teamAnalyticsQuery.data ? (
              <TeamSummaryCard
                totalMembers={teamAnalyticsQuery.data.summary.total_members}
                checkedIn={teamAnalyticsQuery.data.summary.checked_in}
                onLeave={teamAnalyticsQuery.data.summary.on_leave}
                wfhToday={teamAnalyticsQuery.data.summary.wfh_today}
                lateToday={teamAnalyticsQuery.data.summary.late_today}
              />
            ) : null}
            <ReportMetricGrid>
              <ReportSummaryCard title="Team Hours" value={`${totals.hours.toFixed(1)}h`} accentColor={colors.primary} />
              <ReportSummaryCard title="Late Logins" value={totals.late} accentColor={colors.warning} />
              <ReportSummaryCard title="Absences" value={totals.absences} accentColor={colors.danger} />
              <ReportSummaryCard title="WFH Days" value={totals.wfh} accentColor={colors.info} />
            </ReportMetricGrid>
            {performersQuery.data && performersQuery.data.length > 0 ? (
              <SimpleBarChart
                title="Top Performers"
                items={performersQuery.data.slice(0, 5).map((item) => ({
                  label: item.full_name.split(' ')[0] ?? item.full_name,
                  value: Math.round(item.score),
                  color: colors.success,
                }))}
              />
            ) : null}
            {workloadQuery.data && workloadQuery.data.length > 0 ? (
              <TeamWorkloadCard items={workloadQuery.data} />
            ) : null}
            <Text style={styles.sectionTitle}>Team Members</Text>
            {(teamReportQuery.data ?? []).length === 0 ? (
              <ReportEmptyState title="No team data" description="No direct reports found for this period." />
            ) : (
              (teamReportQuery.data ?? []).map((member) => (
                <TeamMemberPerformanceCard key={member.user_id} member={member} />
              ))
            )}
          </ScrollView>
        ) : null}
      </Screen>
    </RoleAccessGuard>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
});
