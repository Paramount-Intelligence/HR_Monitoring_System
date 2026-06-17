import { RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../../src/components/ui/Screen';
import { ManageScreenHeader } from '../../src/components/manage/ManageScreenHeader';
import { EmptyAccessState } from '../../src/components/manage/EmptyAccessState';
import { AttendanceOverviewCard } from '../../src/components/manage/AttendanceOverviewCard';
import { TeamSummaryCard } from '../../src/components/team/TeamSummaryCard';
import { ReportEmptyState } from '../../src/components/reports/ReportEmptyState';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { LoadingState } from '../../src/components/ui/LoadingState';
import { getTeamAttendanceSessions } from '../../src/api/manage.api';
import { getManagerTeamAnalytics } from '../../src/api/reports.api';
import { getErrorMessage, isForbiddenError } from '../../src/api/client';
import { queryKeys } from '../../src/constants/query-keys';
import { todayIsoDate } from '../../src/utils/manage';
import { canAccessTeamReports } from '../../src/utils/role';
import { useAuthStore } from '../../src/auth/auth-store';
import { spacing } from '../../src/constants/theme';

export default function AttendanceReportScreen() {
  const user = useAuthStore((s) => s.user);
  const today = todayIsoDate();

  const attendanceQuery = useQuery({
    queryKey: queryKeys.attendanceTeam({ date_from: today, date_to: today }),
    queryFn: () => getTeamAttendanceSessions({ date_from: today, date_to: today }),
    enabled: canAccessTeamReports(user?.role),
  });

  const teamAnalyticsQuery = useQuery({
    queryKey: queryKeys.reportsTeamAnalytics,
    queryFn: getManagerTeamAnalytics,
    enabled: canAccessTeamReports(user?.role),
  });

  if (!canAccessTeamReports(user?.role)) {
    return (
      <Screen headerSafeArea scroll={false}>
        <ManageScreenHeader title="Team Attendance" subtitle="Today overview" showBack />
        <EmptyAccessState message="Team attendance reports are not available for your role." />
      </Screen>
    );
  }

  return (
    <Screen headerSafeArea scroll={false}>
      <ManageScreenHeader title="Team Attendance Report" subtitle={`Today · ${today}`} showBack />
      {attendanceQuery.isLoading ? <LoadingState message="Loading attendance…" /> : null}
      {attendanceQuery.isError ? (
        <ErrorState
          message={
            isForbiddenError(attendanceQuery.error)
              ? 'You do not have access to team attendance.'
              : getErrorMessage(attendanceQuery.error, 'Unable to load attendance report.')
          }
          onRetry={() => void attendanceQuery.refetch()}
        />
      ) : null}
      {!attendanceQuery.isLoading && !attendanceQuery.isError ? (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={attendanceQuery.isRefetching}
              onRefresh={() => {
                void attendanceQuery.refetch();
                void teamAnalyticsQuery.refetch();
              }}
            />
          }
        >
          {teamAnalyticsQuery.data ? (
            <TeamSummaryCard
              totalMembers={teamAnalyticsQuery.data.summary.total_members}
              checkedIn={teamAnalyticsQuery.data.summary.checked_in}
              onLeave={teamAnalyticsQuery.data.summary.on_leave}
              wfhToday={teamAnalyticsQuery.data.summary.wfh_today}
              lateToday={teamAnalyticsQuery.data.summary.late_today}
            />
          ) : null}
          <Text style={styles.sectionTitle}>Today&apos;s Sessions</Text>
          {(attendanceQuery.data ?? []).length === 0 ? (
            <ReportEmptyState title="No attendance records" description="No team attendance logged for today." />
          ) : (
            (attendanceQuery.data ?? []).map((session) => (
              <AttendanceOverviewCard key={session.id} session={session} />
            ))
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
