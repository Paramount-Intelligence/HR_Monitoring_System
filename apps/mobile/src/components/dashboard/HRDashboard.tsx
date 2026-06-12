import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  DashboardMetricCard,
  DashboardQuickAction,
  DashboardSection,
} from './index';
import { ErrorState } from '../ui/ErrorState';
import { getAdminDashboardSummary } from '../../api/dashboard.api';
import { queryKeys } from '../../constants/query-keys';
import { colors, spacing } from '../../constants/theme';

interface HRDashboardProps {
  unreadMessages: number;
  unreadAlerts: number;
}

export function HRDashboard({ unreadMessages, unreadAlerts }: HRDashboardProps) {
  const router = useRouter();

  const summaryQuery = useQuery({
    queryKey: queryKeys.dashboardAdmin,
    queryFn: getAdminDashboardSummary,
  });

  const summary = summaryQuery.data;

  if (summaryQuery.isError) {
    return (
      <ErrorState
        message="Unable to load HR dashboard."
        onRetry={() => void summaryQuery.refetch()}
      />
    );
  }

  return (
    <>
      <DashboardSection title="Workforce summary">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          <DashboardMetricCard
            index={0}
            title="Team Size"
            value={String(summary?.total_users ?? '…')}
            subtitle="Active employees"
            accentColor={colors.primary}
            loading={summaryQuery.isLoading}
          />
          <DashboardMetricCard
            index={1}
            title="Active Today"
            value={String(summary?.checked_in_today ?? '…')}
            subtitle="Checked in"
            accentColor={colors.success}
            loading={summaryQuery.isLoading}
          />
          <DashboardMetricCard
            index={2}
            title="Pending Approvals"
            value={String(summary?.pending_approvals_count ?? '…')}
            subtitle="Awaiting HR review"
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

      <DashboardSection title="HR operations">
        <DashboardQuickAction
          index={0}
          title="Users"
          subtitle="Employee directory"
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
