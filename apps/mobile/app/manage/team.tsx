import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../../src/components/ui/Screen';
import { ManageScreenHeader } from '../../src/components/manage/ManageScreenHeader';
import { RoleAccessGuard } from '../../src/components/manage/RoleAccessGuard';
import { UserListCard } from '../../src/components/manage/UserListCard';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { OfflineBanner } from '../../src/components/ui/OfflineBanner';
import { LoadingSkeletonList } from '../../src/components/ui/LoadingSkeleton';
import { SearchInput } from '../../src/components/ui/SearchInput';
import { getTeamMembers } from '../../src/api/users.api';
import { getManagerTeamAnalytics } from '../../src/api/reports.api';
import { getErrorMessage, isForbiddenError } from '../../src/api/client';
import { TeamSummaryCard } from '../../src/components/team/TeamSummaryCard';
import { queryKeys } from '../../src/constants/query-keys';
import { isTeamScopedRole } from '../../src/utils/role';
import { useAuthStore } from '../../src/auth/auth-store';
import { colors, spacing } from '../../src/theme';

export default function ManageTeamScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = useState('');

  const teamQuery = useQuery({
    queryKey: queryKeys.users({ scope: 'team', managerId: user?.id }),
    queryFn: () => getTeamMembers(user?.id ? { manager_id: user.id, status: 'active' } : undefined),
    enabled: Boolean(user?.id) && isTeamScopedRole(user?.role),
  });

  const teamAnalyticsQuery = useQuery({
    queryKey: queryKeys.reportsTeamAnalytics,
    queryFn: getManagerTeamAnalytics,
    enabled: Boolean(user?.id) && isTeamScopedRole(user?.role),
  });

  const filteredTeam = useMemo(() => {
    const list = (teamQuery.data ?? []).filter((member) => member.id !== user?.id);
    const term = search.trim().toLowerCase();
    if (!term) return list;
    return list.filter(
      (item) =>
        item.full_name.toLowerCase().includes(term) ||
        item.email.toLowerCase().includes(term)
    );
  }, [search, teamQuery.data, user?.id]);

  return (
    <RoleAccessGuard>
      <Screen headerSafeArea scroll={false}>
        <OfflineBanner />
        <ManageScreenHeader title="My Team" subtitle="Direct reports and team roster" />
        <View style={styles.content}>
          <SearchInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search team members"
            containerStyle={styles.search}
          />
          {teamQuery.isLoading ? <LoadingSkeletonList count={4} /> : null}
          {teamQuery.isError ? (
            <ErrorState
              message={
                isForbiddenError(teamQuery.error)
                  ? 'You do not have access to this team view.'
                  : getErrorMessage(teamQuery.error, 'Unable to load team members.')
              }
              onRetry={() => void teamQuery.refetch()}
            />
          ) : null}
          {!teamQuery.isLoading && !teamQuery.isError ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={teamQuery.isRefetching || teamAnalyticsQuery.isRefetching}
                  onRefresh={() => {
                    void teamQuery.refetch();
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
              {filteredTeam.length === 0 ? (
                <EmptyState
                  title="No team members"
                  description="Your direct reports will appear here."
                />
              ) : (
                filteredTeam.map((member) => (
                  <UserListCard
                    key={member.id}
                    user={member}
                    statusLabel={member.status}
                    statusVariant={member.status === 'active' ? 'success' : 'neutral'}
                    onPress={() =>
                      router.push({
                        pathname: '/manage/user/[userId]',
                        params: { userId: member.id },
                      })
                    }
                  />
                ))
              )}
            </ScrollView>
          ) : null}
        </View>
      </Screen>
    </RoleAccessGuard>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
    backgroundColor: colors.background,
  },
  search: {
    marginBottom: spacing.md,
  },
});
