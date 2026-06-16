import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  DashboardSection,
  DashboardMetricGrid,
  DashboardMetricItem,
  formatMetric,
} from './dashboard-shared';
import { SummaryCard as DashboardMetricCard } from './SummaryCard';
import { QuickActionCard as DashboardQuickAction } from './QuickActionCard';
import { ErrorState } from '../ui/ErrorState';
import { IntelligenceCard } from '../ui/IntelligenceCard';
import { getAdminDashboardSummary } from '../../api/dashboard.api';
import { queryKeys } from '../../constants/query-keys';
import { colors } from '../../theme';

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
  const loading = summaryQuery.isLoading;
  const openAlerts = summary?.open_alerts_count ?? summary?.open_alerts ?? unreadAlerts;

  if (summaryQuery.isError) {
    return (
      <ErrorState
        title="HR dashboard unavailable"
        message="Unable to load people operations overview."
        onRetry={() => void summaryQuery.refetch()}
      />
    );
  }

  return (
    <>
      <DashboardSection title="People operations" subtitle="HR workforce summary">
        <DashboardMetricGrid>
          <DashboardMetricItem>
            <DashboardMetricCard index={0} title="Team Size" value={formatMetric(summary?.total_users)} accentColor={colors.primary} loading={loading} />
          </DashboardMetricItem>
          <DashboardMetricItem>
            <DashboardMetricCard index={1} title="Active Users" value={formatMetric(summary?.active_users)} accentColor={colors.info} loading={loading} />
          </DashboardMetricItem>
          <DashboardMetricItem>
            <DashboardMetricCard index={2} title="Present Today" value={formatMetric(summary?.checked_in_today)} accentColor={colors.success} loading={loading} />
          </DashboardMetricItem>
          <DashboardMetricItem>
            <DashboardMetricCard index={3} title="WFH Today" value={formatMetric(summary?.wfh_today)} accentColor={colors.info} loading={loading} />
          </DashboardMetricItem>
          <DashboardMetricItem>
            <DashboardMetricCard index={4} title="Pending Approvals" value={formatMetric(summary?.pending_approvals_count)} accentColor={colors.warning} loading={loading} />
          </DashboardMetricItem>
          <DashboardMetricItem>
            <DashboardMetricCard index={5} title="Overdue Tasks" value={formatMetric(summary?.overdue_tasks_count)} accentColor={colors.danger} loading={loading} />
          </DashboardMetricItem>
          <DashboardMetricItem>
            <DashboardMetricCard index={6} title="Messages" value={formatMetric(unreadMessages, '0')} accentColor={colors.info} />
          </DashboardMetricItem>
          <DashboardMetricItem>
            <DashboardMetricCard index={7} title="Alerts" value={formatMetric(openAlerts, '0')} accentColor={colors.warning} loading={loading} />
          </DashboardMetricItem>
        </DashboardMetricGrid>
      </DashboardSection>

      <IntelligenceCard
        title="Workload snapshot"
        subtitle="Projects and tasks connected to workforce delivery"
        accentColor={colors.primary}
      />

      <DashboardSection title="HR operations">
        <DashboardQuickAction index={0} title="Users" subtitle="Employee directory" onPress={() => router.push('/manage/users' as never)} />
        <DashboardQuickAction index={1} title="Attendance Overview" subtitle="Org-wide attendance" onPress={() => router.push('/manage/attendance' as never)} />
        <DashboardQuickAction index={2} title="Leave Requests" subtitle="Pending leave queue" onPress={() => router.push('/manage/leaves' as never)} />
        <DashboardQuickAction index={3} title="Attendance Corrections" subtitle="Review corrections" onPress={() => router.push('/manage/corrections' as never)} />
        <DashboardQuickAction index={4} title="Reports" subtitle="Workforce insights" onPress={() => router.push('/reports' as never)} />
        <DashboardQuickAction index={5} title="Alerts" subtitle={unreadAlerts > 0 ? `${unreadAlerts} unread` : 'Notification center'} onPress={() => router.push('/alerts')} />
        <DashboardQuickAction index={6} title="Messages" subtitle={unreadMessages > 0 ? `${unreadMessages} unread` : 'Conversations'} onPress={() => router.push('/(tabs)/messages')} />
      </DashboardSection>
    </>
  );
}
