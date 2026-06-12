import { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../../src/components/ui/Screen';
import { AppHeader } from '../../src/components/layout/AppHeader';
import { ManageHubCard } from '../../src/components/manage/ManageHubCard';
import { RoleAccessGuard } from '../../src/components/manage/RoleAccessGuard';
import { StatCard, StatCardSkeleton } from '../../src/components/manage/StatCard';
import { EmptyAccessState } from '../../src/components/manage/EmptyAccessState';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { useAuthStore } from '../../src/auth/auth-store';
import { getManageSummary } from '../../src/api/manage.api';
import { getPendingCorrections, getPendingLeaveRequests } from '../../src/api/approvals.api';
import { queryKeys } from '../../src/constants/query-keys';
import {
  canAccessAllUsers,
  canAccessApprovals,
  canAccessTeamAttendance,
  getManageHubTitle,
  isTeamScopedRole,
  normalizeRole,
} from '../../src/utils/role';
import { spacing } from '../../src/constants/theme';

export default function ManageTabScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const role = normalizeRole(user?.role);

  const summaryQuery = useQuery({
    queryKey: queryKeys.manageSummary(role),
    queryFn: () => getManageSummary(user?.role),
    enabled: Boolean(user),
  });

  const leavesQuery = useQuery({
    queryKey: queryKeys.pendingLeaves,
    queryFn: getPendingLeaveRequests,
  });

  const correctionsQuery = useQuery({
    queryKey: queryKeys.pendingCorrections,
    queryFn: getPendingCorrections,
  });

  const pendingCount = (leavesQuery.data?.length ?? 0) + (correctionsQuery.data?.length ?? 0);

  const cards = useMemo(() => {
    const items: {
      key: string;
      title: string;
      subtitle: string;
      icon: 'people-outline' | 'calendar-outline' | 'checkmark-done-outline' | 'document-text-outline' | 'bar-chart-outline';
      badge?: number;
      route: string;
    }[] = [];

    if (canAccessAllUsers(role)) {
      items.push({
        key: 'users',
        title: 'Users',
        subtitle: 'Company directory and profiles',
        icon: 'people-outline',
        route: '/manage/users',
      });
    } else if (isTeamScopedRole(role)) {
      items.push({
        key: 'team',
        title: 'My Team',
        subtitle: 'Direct reports and team roster',
        icon: 'people-outline',
        route: '/manage/team',
      });
    }

    if (canAccessTeamAttendance(role)) {
      items.push({
        key: 'attendance',
        title: isTeamScopedRole(role) ? 'Team Attendance' : 'Attendance Overview',
        subtitle: 'Today status, check-ins, and flags',
        icon: 'calendar-outline',
        route: '/manage/attendance',
      });
    }

    if (canAccessApprovals(role)) {
      items.push({
        key: 'approvals',
        title: 'Pending Approvals',
        subtitle: 'Leave, WFH, and correction requests',
        icon: 'checkmark-done-outline',
        badge: pendingCount,
        route: '/manage/approvals',
      });
      items.push({
        key: 'leaves',
        title: 'Leave Requests',
        subtitle: 'Review leave and WFH queue',
        icon: 'document-text-outline',
        badge: leavesQuery.data?.length,
        route: '/manage/leaves',
      });
    }

    items.push({
      key: 'reports',
      title: 'Reports',
      subtitle: 'Attendance, leave, and workforce insights',
      icon: 'bar-chart-outline' as const,
      route: '/reports',
    });

    return items;
  }, [correctionsQuery.data?.length, leavesQuery.data?.length, pendingCount, role]);

  const refreshing =
    summaryQuery.isRefetching || leavesQuery.isRefetching || correctionsQuery.isRefetching;

  return (
    <RoleAccessGuard fallback={<EmptyAccessState />}>
      <Screen scroll={false} withTabBarInset>
        <AppHeader title={getManageHubTitle(role)} subtitle="Workforce management" />
        {summaryQuery.isError ? (
          <ErrorState message="Unable to load manage summary." onRetry={() => void summaryQuery.refetch()} />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  void summaryQuery.refetch();
                  void leavesQuery.refetch();
                  void correctionsQuery.refetch();
                }}
              />
            }
          >
            <Text style={styles.sectionTitle}>Summary</Text>
            <View style={styles.statsGrid}>
              {summaryQuery.isLoading ? (
                <>
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                </>
              ) : (
                <>
                  {summaryQuery.data?.activeEmployees != null ? (
                    <StatCard label="Active employees" value={summaryQuery.data.activeEmployees} />
                  ) : null}
                  {summaryQuery.data?.teamMembers != null ? (
                    <StatCard label="Team members" value={summaryQuery.data.teamMembers} />
                  ) : null}
                  {summaryQuery.data?.presentToday != null ? (
                    <StatCard label="Present today" value={summaryQuery.data.presentToday} />
                  ) : null}
                  {summaryQuery.data?.teamPresent != null ? (
                    <StatCard label="Team present" value={summaryQuery.data.teamPresent} />
                  ) : null}
                  <StatCard label="Pending approvals" value={pendingCount} />
                </>
              )}
            </View>

            <Text style={styles.sectionTitle}>Manage</Text>
            {cards.map((card, cardIndex) => (
              <ManageHubCard
                key={card.key}
                index={cardIndex}
                title={card.title}
                subtitle={card.subtitle}
                icon={card.icon}
                badge={card.badge}
                onPress={() => router.push(card.route as never)}
              />
            ))}
          </ScrollView>
        )}
      </Screen>
    </RoleAccessGuard>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
});
