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
import { getAdminAnalytics, getAdminDashboardSummary } from '../../api/dashboard.api';
import { queryKeys } from '../../constants/query-keys';
import { colors } from '../../theme';

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

  const summary = summaryQuery.data ?? analyticsQuery.data;
  const loading = summaryQuery.isLoading || analyticsQuery.isLoading;

  if (summaryQuery.isError && analyticsQuery.isError) {
    return (
      <ErrorState
        title="Admin dashboard unavailable"
        message="Unable to load workforce overview."
        onRetry={() => {
          void summaryQuery.refetch();
          void analyticsQuery.refetch();
        }}
      />
    );
  }

  const openAlerts = summary?.open_alerts_count ?? summary?.open_alerts ?? unreadAlerts;

  return (
    <>
      <DashboardSection index={0} title="Workforce overview" subtitle="Organization-wide metrics">
        <DashboardMetricGrid>
          <DashboardMetricItem>
            <DashboardMetricCard index={0} title="Total Employees" value={formatMetric(summary?.total_users)} accentColor={colors.primary} loading={loading} />
          </DashboardMetricItem>
          <DashboardMetricItem>
            <DashboardMetricCard index={1} title="Active Users" value={formatMetric(summary?.active_users)} accentColor={colors.info} loading={loading} />
          </DashboardMetricItem>
          <DashboardMetricItem>
            <DashboardMetricCard index={2} title="Present Today" value={formatMetric(summary?.checked_in_today)} subtitle={`${formatMetric(summary?.wfh_today, '0')} WFH · ${formatMetric(summary?.office_today, '0')} office`} accentColor={colors.success} loading={loading} />
          </DashboardMetricItem>
          <DashboardMetricItem>
            <DashboardMetricCard index={3} title="Pending Approvals" value={formatMetric(summary?.pending_approvals_count)} accentColor={colors.warning} loading={loading} />
          </DashboardMetricItem>
          <DashboardMetricItem>
            <DashboardMetricCard index={4} title="Active Projects" value={formatMetric(summary?.active_projects)} subtitle={loading && summary?.active_projects == null ? 'Loading…' : undefined} accentColor={colors.primary} loading={loading} />
          </DashboardMetricItem>
          <DashboardMetricItem>
            <DashboardMetricCard index={5} title="Overdue Tasks" value={formatMetric(summary?.overdue_tasks_count)} accentColor={colors.danger} loading={loading} />
          </DashboardMetricItem>
          <DashboardMetricItem>
            <DashboardMetricCard index={6} title="Messages" value={formatMetric(unreadMessages, '0')} subtitle="Unread" accentColor={colors.info} />
          </DashboardMetricItem>
          <DashboardMetricItem>
            <DashboardMetricCard index={7} title="Alerts" value={formatMetric(openAlerts, '0')} subtitle="Open / unread" accentColor={colors.warning} loading={loading} />
          </DashboardMetricItem>
        </DashboardMetricGrid>
      </DashboardSection>

      <IntelligenceCard
        index={1}
        title="Alert summary"
        subtitle={`${formatMetric(openAlerts, '0')} alerts need attention · Tap to review`}
        accentColor={colors.warning}
        onPress={() => router.push('/alerts')}
      />

      <DashboardSection index={2} title="Operations">
        <DashboardQuickAction index={0} title="Manage Users" subtitle="Company directory" onPress={() => router.push('/manage/users' as never)} />
        <DashboardQuickAction index={1} title="Attendance Overview" subtitle="Org-wide attendance" onPress={() => router.push('/manage/attendance' as never)} />
        <DashboardQuickAction index={2} title="Projects" subtitle="Browse active projects" onPress={() => router.push('/(tabs)/projects')} />
        <DashboardQuickAction index={3} title="Tasks" subtitle="Org task overview" onPress={() => router.push('/(tabs)/tasks')} />
        <DashboardQuickAction index={4} title="Assign Task" subtitle="Create and assign work" onPress={() => router.push('/tasks/create' as never)} />
        <DashboardQuickAction index={5} title="Leave Requests" subtitle="Pending leave queue" onPress={() => router.push('/manage/leaves' as never)} />
        <DashboardQuickAction index={6} title="Attendance Corrections" subtitle="Review correction queue" onPress={() => router.push('/manage/corrections' as never)} />
        <DashboardQuickAction index={7} title="Reports" subtitle="Workforce insights" onPress={() => router.push('/reports' as never)} />
        <DashboardQuickAction index={8} title="Messages" subtitle={unreadMessages > 0 ? `${unreadMessages} unread` : 'Team conversations'} onPress={() => router.push('/(tabs)/messages')} />
      </DashboardSection>
    </>
  );
}
