import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Screen } from '../../../src/components/ui/Screen';
import { ManageScreenHeader } from '../../../src/components/manage/ManageScreenHeader';
import { RoleAccessGuard } from '../../../src/components/manage/RoleAccessGuard';
import { UserDetailCard } from '../../../src/components/manage/UserDetailCard';
import { ReportMetricGrid } from '../../../src/components/reports/ReportMetricGrid';
import { ReportSummaryCard } from '../../../src/components/reports/ReportSummaryCard';
import { TeamMemberPerformanceCard } from '../../../src/components/team/TeamMemberPerformanceCard';
import { AppButton } from '../../../src/components/ui/AppButton';
import { ErrorState } from '../../../src/components/ui/ErrorState';
import { LoadingState } from '../../../src/components/ui/LoadingState';
import { getOrCreateContextThread } from '../../../src/api/conversations.api';
import { getPendingLeaveRequests } from '../../../src/api/approvals.api';
import { getTeamMemberReport } from '../../../src/api/team.api';
import { getUser } from '../../../src/api/users.api';
import { getErrorMessage, isForbiddenError } from '../../../src/api/client';
import { queryKeys } from '../../../src/constants/query-keys';
import { getReportDateRange } from '../../../src/utils/report-dates';
import { colors, spacing } from '../../../src/constants/theme';

export default function ManageUserDetailScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [messaging, setMessaging] = useState(false);
  const range = getReportDateRange('month');

  const userQuery = useQuery({
    queryKey: queryKeys.userDetail(userId ?? ''),
    queryFn: () => getUser(userId!),
    enabled: Boolean(userId),
  });

  const memberReportQuery = useQuery({
    queryKey: queryKeys.userReport(userId ?? '', {
      start_date: range.start_date,
      end_date: range.end_date,
    }),
    queryFn: () =>
      getTeamMemberReport(userId!, {
        start_date: range.start_date,
        end_date: range.end_date,
      }),
    enabled: Boolean(userId),
  });

  const pendingLeavesQuery = useQuery({
    queryKey: queryKeys.pendingLeaves,
    queryFn: getPendingLeaveRequests,
  });

  const memberPendingLeaves = useMemo(
    () => (pendingLeavesQuery.data ?? []).filter((item) => item.user_id === userId),
    [pendingLeavesQuery.data, userId]
  );

  const messageMutation = useMutation({
    mutationFn: () => getOrCreateContextThread(userId!),
    onSuccess: (conversation) => {
      router.push({
        pathname: '/chat/[conversationId]',
        params: { conversationId: conversation.id },
      });
    },
    onError: (error) => {
      Alert.alert('Unable to open chat', getErrorMessage(error, 'Could not start a conversation.'));
    },
    onSettled: () => setMessaging(false),
  });

  return (
    <RoleAccessGuard>
      <Screen scroll>
        <ManageScreenHeader title="Team Member" subtitle="Profile, reports, and actions" />
        {userQuery.isLoading ? <LoadingState message="Loading profile…" /> : null}
        {userQuery.isError ? (
          <ErrorState
            message={
              isForbiddenError(userQuery.error)
                ? 'You do not have access to this user profile.'
                : getErrorMessage(userQuery.error, 'Unable to load user profile.')
            }
            onRetry={() => void userQuery.refetch()}
          />
        ) : null}
        {userQuery.data ? (
          <>
            <UserDetailCard user={userQuery.data} />
            {memberReportQuery.data ? (
              <>
                <ReportMetricGrid>
                  <ReportSummaryCard
                    title="Hours"
                    value={`${memberReportQuery.data.total_hours.toFixed(1)}h`}
                    accentColor={colors.primary}
                  />
                  <ReportSummaryCard
                    title="Late"
                    value={memberReportQuery.data.late_logins}
                    accentColor={colors.warning}
                  />
                  <ReportSummaryCard
                    title="WFH"
                    value={memberReportQuery.data.wfh_days}
                    accentColor={colors.info}
                  />
                  <ReportSummaryCard
                    title="Absences"
                    value={memberReportQuery.data.absences}
                    accentColor={colors.danger}
                  />
                </ReportMetricGrid>
                <TeamMemberPerformanceCard member={memberReportQuery.data} />
              </>
            ) : null}
            {memberPendingLeaves.length > 0 ? (
              <ReportSummaryCard
                title="Pending Requests"
                value={memberPendingLeaves.length}
                subtitle="Leave/WFH awaiting approval"
                accentColor={colors.warning}
              />
            ) : null}
            <View style={styles.actions}>
              <AppButton
                title="Message User"
                variant="secondary"
                loading={messaging || messageMutation.isPending}
                onPress={() => {
                  setMessaging(true);
                  messageMutation.mutate();
                }}
              />
              <AppButton
                title="View Attendance Overview"
                variant="secondary"
                onPress={() => router.push('/manage/attendance')}
              />
              <AppButton
                title="View Team Reports"
                variant="secondary"
                onPress={() => router.push('/reports/team')}
              />
            </View>
          </>
        ) : null}
      </Screen>
    </RoleAccessGuard>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
