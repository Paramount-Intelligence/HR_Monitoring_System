import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  DashboardMetricCard,
  DashboardQuickAction,
  DashboardSection,
} from './index';
import { ErrorState } from '../ui/ErrorState';
import { getManagerOverview } from '../../api/dashboard.api';
import { getPendingCorrections, getPendingLeaveRequests } from '../../api/approvals.api';
import { queryKeys } from '../../constants/query-keys';
import { colors, spacing } from '../../constants/theme';

interface ManagerDashboardProps {
  unreadMessages: number;
  unreadAlerts: number;
}

export function ManagerDashboard({ unreadMessages, unreadAlerts }: ManagerDashboardProps) {
  const router = useRouter();

  const overviewQuery = useQuery({
    queryKey: queryKeys.dashboardManagerOverview,
    queryFn: getManagerOverview,
  });

  const leavesQuery = useQuery({
    queryKey: queryKeys.pendingLeaves,
    queryFn: getPendingLeaveRequests,
  });

  const correctionsQuery = useQuery({
    queryKey: queryKeys.pendingCorrections,
    queryFn: getPendingCorrections,
  });

  const kpis = overviewQuery.data?.kpis;
  const pendingApprovals =
    (leavesQuery.data?.length ?? 0) + (correctionsQuery.data?.length ?? 0);

  if (overviewQuery.isError) {
    return (
      <ErrorState
        message="Unable to load manager dashboard."
        onRetry={() => void overviewQuery.refetch()}
      />
    );
  }

  return (
    <>
      <DashboardSection title="Team overview">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          <DashboardMetricCard
            index={0}
            title="Team Members"
            value={String(kpis?.team_members ?? '…')}
            subtitle="Direct reports"
            accentColor={colors.primary}
            loading={overviewQuery.isLoading}
          />
          <DashboardMetricCard
            index={1}
            title="Present Today"
            value={String(kpis?.present_today ?? '…')}
            subtitle="Checked in"
            accentColor={colors.success}
            loading={overviewQuery.isLoading}
          />
          <DashboardMetricCard
            index={2}
            title="Pending Approvals"
            value={String(kpis?.pending_approvals ?? pendingApprovals)}
            subtitle="Leave & corrections"
            accentColor={colors.warning}
            loading={overviewQuery.isLoading}
          />
          <DashboardMetricCard
            index={3}
            title="Overdue Tasks"
            value={String(kpis?.overdue_tasks ?? '…')}
            subtitle="Team workload"
            accentColor={colors.danger}
            loading={overviewQuery.isLoading}
          />
          <DashboardMetricCard
            index={4}
            title="Messages"
            value={String(unreadMessages)}
            subtitle="Unread"
            accentColor={colors.info}
          />
          <DashboardMetricCard
            index={5}
            title="Alerts"
            value={String(unreadAlerts)}
            subtitle="Unread"
            accentColor={colors.warning}
          />
        </View>
      </DashboardSection>

      <DashboardSection title="Manager quick actions">
        <DashboardQuickAction
          index={0}
          title="My Team"
          subtitle="Team roster and profiles"
          onPress={() => router.push('/manage/team' as never)}
        />
        <DashboardQuickAction
          index={1}
          title="Team Attendance"
          subtitle="Today status and flags"
          onPress={() => router.push('/manage/attendance' as never)}
        />
        <DashboardQuickAction
          index={2}
          title="Pending Approvals"
          subtitle={
            pendingApprovals > 0
              ? `${pendingApprovals} waiting`
              : 'Leave, WFH, corrections'
          }
          onPress={() => router.push('/manage/approvals' as never)}
        />
        <DashboardQuickAction
          index={3}
          title="Team Reports"
          subtitle="Attendance and leave insights"
          onPress={() => router.push('/reports/team' as never)}
        />
        <DashboardQuickAction
          index={4}
          title="Messages"
          subtitle={unreadMessages > 0 ? `${unreadMessages} unread` : 'Team conversations'}
          onPress={() => router.push('/(tabs)/messages')}
        />
        <DashboardQuickAction
          index={5}
          title="Alerts"
          subtitle={unreadAlerts > 0 ? `${unreadAlerts} unread` : 'Latest updates'}
          onPress={() => router.push('/(tabs)/notifications')}
        />
      </DashboardSection>
    </>
  );
}
