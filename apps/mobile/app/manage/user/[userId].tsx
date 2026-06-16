import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Screen } from '../../../src/components/ui/Screen';
import { ManageScreenHeader } from '../../../src/components/manage/ManageScreenHeader';
import { OfflineBanner } from '../../../src/components/ui/OfflineBanner';
import { RoleAccessGuard } from '../../../src/components/manage/RoleAccessGuard';
import { AdminUserManagementPanel } from '../../../src/components/manage/AdminUserManagementPanel';
import { UserDetailCard } from '../../../src/components/manage/UserDetailCard';
import { TeamMemberPerformanceCard } from '../../../src/components/team/TeamMemberPerformanceCard';
import { AppButton } from '../../../src/components/ui/AppButton';
import { ErrorState } from '../../../src/components/ui/ErrorState';
import { LoadingState } from '../../../src/components/ui/LoadingState';
import { getOrCreateContextThread } from '../../../src/api/conversations.api';
import { getTeamMemberReport } from '../../../src/api/team.api';
import { getUser } from '../../../src/api/users.api';
import { getErrorMessage, isForbiddenError } from '../../../src/api/client';
import { queryKeys } from '../../../src/constants/query-keys';
import { getReportDateRange } from '../../../src/utils/report-dates';
import { canAccessAllUsers } from '../../../src/utils/role';
import { useAuthStore } from '../../../src/auth/auth-store';
import { spacing } from '../../../src/constants/theme';

export default function ManageUserDetailScreen() {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [messaging, setMessaging] = useState(false);
  const range = getReportDateRange('month');
  const isAdminView = canAccessAllUsers(currentUser?.role);

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
    enabled: Boolean(userId) && !isAdminView,
  });

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
      <Screen scroll={false}>
        <OfflineBanner />
        <ManageScreenHeader
          title={isAdminView ? 'User management' : 'Team member'}
          subtitle={isAdminView ? 'Profile, access, permissions, and security' : 'Profile and reports'}
        />
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
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {isAdminView ? (
              <AdminUserManagementPanel user={userQuery.data} />
            ) : (
              <>
                <UserDetailCard user={userQuery.data} />
                {memberReportQuery.data ? (
                  <TeamMemberPerformanceCard member={memberReportQuery.data} />
                ) : null}
                <View style={styles.actions}>
                  <AppButton
                    title="Message user"
                    variant="secondary"
                    loading={messaging || messageMutation.isPending}
                    onPress={() => {
                      setMessaging(true);
                      messageMutation.mutate();
                    }}
                  />
                </View>
              </>
            )}
          </ScrollView>
        ) : null}
      </Screen>
    </RoleAccessGuard>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
