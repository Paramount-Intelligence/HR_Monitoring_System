import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../../src/components/ui/Screen';
import { ManageScreenHeader } from '../../src/components/manage/ManageScreenHeader';
import { RoleAccessGuard } from '../../src/components/manage/RoleAccessGuard';
import { UserListCard } from '../../src/components/manage/UserListCard';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { AppEmptyState } from '../../src/components/ui/AppEmptyState';
import { LoadingState } from '../../src/components/ui/LoadingState';
import { getTeamMembers } from '../../src/api/users.api';
import { getManagerTeamAnalytics } from '../../src/api/reports.api';
import { getErrorMessage, isForbiddenError } from '../../src/api/client';
import { TeamSummaryCard } from '../../src/components/team/TeamSummaryCard';
import { queryKeys } from '../../src/constants/query-keys';
import { isTeamScopedRole } from '../../src/utils/role';
import { useAuthStore } from '../../src/auth/auth-store';
import { colors, spacing } from '../../src/constants/theme';

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
      <Screen scroll={false}>
        <ManageScreenHeader title="My Team" subtitle="Direct reports and team roster" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search team members"
          placeholderTextColor={colors.mutedText}
          style={styles.search}
        />
        {teamQuery.isLoading ? <LoadingState message="Loading team…" /> : null}
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
              <AppEmptyState title="No team members" description="Your direct reports will appear here." />
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
      </Screen>
    </RoleAccessGuard>
  );
}

const styles = StyleSheet.create({
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.card,
    marginBottom: spacing.md,
  },
});
