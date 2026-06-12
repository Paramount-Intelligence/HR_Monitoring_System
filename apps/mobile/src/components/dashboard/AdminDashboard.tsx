import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  DashboardMetricCard,
  DashboardQuickAction,
  DashboardSection,
} from './index';
import { ErrorState } from '../ui/ErrorState';
import { getAdminAnalytics, getAdminDashboardSummary } from '../../api/dashboard.api';
import { queryKeys } from '../../constants/query-keys';
import { colors, spacing } from '../../constants/theme';

interface AdminDashboardProps {
  unreadMessages: number;
  unreadAlerts: number;
}

export function AdminDashboard({ unreadMessages, unreadAlerts }: AdminDashboardProps) {
  const router = useRouter();

  const summaryQuery = useQuery({
    queryKey: queryKeys.dashboardAdmin,
    queryFn: getAdminDashboardSummary,
  });

  const analyticsQuery = useQuery({
    queryKey: queryKeys.dashboardAdminAnalytics,
    queryFn: getAdminAnalytics,
  });

  const summary = summaryQuery.data;
  const analytics = analyticsQuery.data;

  if (summaryQuery.isError && analyticsQuery.isError) {
    return (
      <ErrorState
        message="Unable to load admin dashboard."
        onRetry={() => {
          void summaryQuery.refetch();
          void analyticsQuery.refetch();
        }}
      />
    );
  }

  return (
    <>
      <DashboardSection title="Workforce overview">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          <DashboardMetricCard
            index={0}
            title="Total Employees"
            value={String(summary?.total_users ?? analytics?.active_users ?? '…')}
            accentColor={colors.primary}
            loading={summaryQuery.isLoading}
          />
          <DashboardMetricCard
            index={1}
            title="Present Today"
            value={String(summary?.checked_in_today ?? '…')}
            subtitle={`${summary?.wfh_today ?? 0} WFH · ${summary?.office_today ?? 0} office`}
            accentColor={colors.success}
            loading={summaryQuery.isLoading}
          />
          <DashboardMetricCard
            index={2}
            title="Pending Approvals"
            value={String(summary?.pending_approvals_count ?? '…')}
            accentColor={colors.warning}
            loading={summaryQuery.isLoading}
          />
          <DashboardMetricCard
            index={3}
            title="Open Alerts"
            value={String(summary?.open_alerts_count ?? summary?.open_alerts ?? '…')}
            accentColor={colors.info}
            loading={summaryQuery.isLoading}
          />
        </View>
      </DashboardSection>

      <DashboardSection title="Operations">
        <DashboardQuickAction
          index={0}
          title="Manage Users"
          subtitle="Company directory"
          onPress={() => router.push('/manage/users' as never)}
        />
        <DashboardQuickAction
          index={1}
          title="Attendance Overview"
          subtitle="Org-wide attendance"
          onPress={() => router.push('/manage/attendance' as never)}
        />
        <DashboardQuickAction
          index={2}
          title="Leave Requests"
          subtitle="Pending leave queue"
          onPress={() => router.push('/manage/leaves' as never)}
        />
        <DashboardQuickAction
          index={3}
          title="Reports"
          subtitle="Workforce insights"
          onPress={() => router.push('/reports' as never)}
        />
        <DashboardQuickAction
          index={4}
          title="Messages"
          subtitle={unreadMessages > 0 ? `${unreadMessages} unread` : 'Conversations'}
          onPress={() => router.push('/(tabs)/messages')}
        />
        <DashboardQuickAction
          index={5}
          title="Alerts"
          subtitle={unreadAlerts > 0 ? `${unreadAlerts} unread` : 'System updates'}
          onPress={() => router.push('/(tabs)/notifications')}
        />
      </DashboardSection>
    </>
  );
}
