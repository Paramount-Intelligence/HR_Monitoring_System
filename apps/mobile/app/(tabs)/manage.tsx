import { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../../src/components/ui/Screen';
import { BrandHeader } from '../../src/components/brand/BrandHeader';
import { OfflineBanner } from '../../src/components/ui/OfflineBanner';
import { ManageHubCard } from '../../src/components/manage/ManageHubCard';
import { RoleAccessGuard } from '../../src/components/manage/RoleAccessGuard';
import { StatCard, StatCardSkeleton } from '../../src/components/manage/StatCard';
import { EmptyAccessState } from '../../src/components/manage/EmptyAccessState';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { MetricBentoGrid, MetricBentoItem } from '../../src/components/ui/MetricBentoGrid';
import { useAuthStore } from '../../src/auth/auth-store';
import { getManageSummary } from '../../src/api/manage.api';
import { getPendingCorrections, getPendingLeaveRequests } from '../../src/api/approvals.api';
import { queryKeys } from '../../src/constants/query-keys';
import { useTabScreenBottomInset } from '../../src/hooks/useTabScreenBottomInset';
import {
  canAccessAllUsers,
  canAccessApprovals,
  canAccessTeamAttendance,
  getManageHubTitle,
  isTeamScopedRole,
  normalizeRole,
} from '../../src/utils/role';
import { colors, spacing, typography } from '../../src/theme';

export default function ManageTabScreen() {
  const router = useRouter();
  const tabBottomInset = useTabScreenBottomInset();
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
      icon: 'people-outline' | 'calendar-outline' | 'checkmark-done-outline' | 'document-text-outline' | 'bar-chart-outline' | 'create-outline';
      badge?: number;
      route: string;
      accentColor?: string;
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
        accentColor: colors.info,
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
        accentColor: colors.warning,
      });
      items.push({
        key: 'leaves',
        title: 'Leave Requests',
        subtitle: 'Review leave and WFH queue',
        icon: 'document-text-outline',
        badge: leavesQuery.data?.length,
        route: '/manage/leaves',
      });
      items.push({
        key: 'corrections',
        title: 'Attendance Corrections',
        subtitle: 'Review correction requests',
        icon: 'create-outline',
        badge: correctionsQuery.data?.length,
        route: '/manage/corrections',
      });
    }

    items.push({
      key: 'reports',
      title: 'Reports',
      subtitle: 'Attendance, leave, and workforce insights',
      icon: 'bar-chart-outline',
      route: '/reports',
      accentColor: colors.success,
    });

    return items;
  }, [correctionsQuery.data?.length, leavesQuery.data?.length, pendingCount, role]);

  const refreshing =
    summaryQuery.isRefetching || leavesQuery.isRefetching || correctionsQuery.isRefetching;

  return (
    <RoleAccessGuard fallback={<EmptyAccessState />}>
      <Screen scroll={false} withTabBarInset headerSafeArea edges={['left', 'right']}>
        <OfflineBanner />
        <BrandHeader
          title={getManageHubTitle(role)}
          subtitle="Workforce management tools"
          onBack={() => router.back()}
          centerTitle
        />
        {summaryQuery.isError ? (
          <ErrorState
            message="Unable to load manage summary."
            onRetry={() => void summaryQuery.refetch()}
          />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: tabBottomInset },
            ]}
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
            <Text style={[typography.titleMd, styles.sectionTitle]}>Summary</Text>
            <MetricBentoGrid>
              {summaryQuery.isLoading ? (
                <>
                  <MetricBentoItem>
                    <StatCardSkeleton />
                  </MetricBentoItem>
                  <MetricBentoItem>
                    <StatCardSkeleton />
                  </MetricBentoItem>
                </>
              ) : (
                <>
                  {summaryQuery.data?.activeEmployees != null ? (
                    <MetricBentoItem>
                      <StatCard
                        label="Active employees"
                        value={summaryQuery.data.activeEmployees}
                      />
                    </MetricBentoItem>
                  ) : null}
                  {summaryQuery.data?.teamMembers != null ? (
                    <MetricBentoItem>
                      <StatCard label="Team members" value={summaryQuery.data.teamMembers} />
                    </MetricBentoItem>
                  ) : null}
                  {summaryQuery.data?.presentToday != null ? (
                    <MetricBentoItem>
                      <StatCard
                        label="Present today"
                        value={summaryQuery.data.presentToday}
                        accentColor={colors.success}
                      />
                    </MetricBentoItem>
                  ) : null}
                  {summaryQuery.data?.teamPresent != null ? (
                    <MetricBentoItem>
                      <StatCard
                        label="Team present"
                        value={summaryQuery.data.teamPresent}
                        accentColor={colors.success}
                      />
                    </MetricBentoItem>
                  ) : null}
                  <MetricBentoItem>
                    <StatCard
                      label="Pending approvals"
                      value={pendingCount}
                      accentColor={colors.warning}
                    />
                  </MetricBentoItem>
                </>
              )}
            </MetricBentoGrid>

            <Text style={[typography.titleMd, styles.sectionTitle]}>Tools</Text>
            {cards.map((card, cardIndex) => (
              <ManageHubCard
                key={card.key}
                index={cardIndex}
                title={card.title}
                subtitle={card.subtitle}
                icon={card.icon}
                badge={card.badge}
                accentColor={card.accentColor}
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
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: spacing.md,
  },
});
