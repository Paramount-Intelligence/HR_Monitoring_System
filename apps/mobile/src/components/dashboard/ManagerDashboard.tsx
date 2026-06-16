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
import { getManagerOverview } from '../../api/dashboard.api';
import { getPendingCorrections, getPendingLeaveRequests } from '../../api/approvals.api';
import { queryKeys } from '../../constants/query-keys';
import { colors } from '../../theme';

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
  const pendingFromApi = kpis?.pending_approvals ?? pendingApprovals;
  const loading = overviewQuery.isLoading;

  if (overviewQuery.isError) {
    return (
      <ErrorState
        title="Manager dashboard unavailable"
        message="Unable to load team overview."
        onRetry={() => void overviewQuery.refetch()}
      />
    );
  }

  const pendingActions = overviewQuery.data?.pending_actions ?? [];

  return (
    <>
      <DashboardSection title="Team overview" subtitle="Direct reports & attendance">
        <DashboardMetricGrid>
          <DashboardMetricItem>
            <DashboardMetricCard index={0} title="Team Members" value={formatMetric(kpis?.team_members)} accentColor={colors.primary} loading={loading} />
          </DashboardMetricItem>
          <DashboardMetricItem>
            <DashboardMetricCard index={1} title="Present Today" value={formatMetric(kpis?.present_today)} accentColor={colors.success} loading={loading} />
          </DashboardMetricItem>
          <DashboardMetricItem>
            <DashboardMetricCard index={2} title="Pending Approvals" value={formatMetric(pendingFromApi)} accentColor={colors.warning} loading={loading} />
          </DashboardMetricItem>
          <DashboardMetricItem>
            <DashboardMetricCard index={3} title="Team Projects" value={formatMetric(kpis?.projects_in_progress)} subtitle={kpis?.projects_in_progress == null ? 'Team project overview' : 'In progress'} accentColor={colors.info} loading={loading} />
          </DashboardMetricItem>
          <DashboardMetricItem>
            <DashboardMetricCard index={4} title="Active Tasks" value={formatMetric(kpis?.active_tasks)} accentColor={colors.primary} loading={loading} />
          </DashboardMetricItem>
          <DashboardMetricItem>
            <DashboardMetricCard index={5} title="Overdue Tasks" value={formatMetric(kpis?.overdue_tasks)} accentColor={colors.danger} loading={loading} />
          </DashboardMetricItem>
          <DashboardMetricItem>
            <DashboardMetricCard index={6} title="Messages" value={formatMetric(unreadMessages, '0')} accentColor={colors.info} />
          </DashboardMetricItem>
          <DashboardMetricItem>
            <DashboardMetricCard index={7} title="Alerts" value={formatMetric(unreadAlerts, '0')} accentColor={colors.warning} />
          </DashboardMetricItem>
        </DashboardMetricGrid>
      </DashboardSection>

      <IntelligenceCard
        title="Team workload"
        subtitle={`${formatMetric(kpis?.active_tasks)} active · ${formatMetric(kpis?.overdue_tasks)} overdue · ${formatMetric(kpis?.team_workload)} workload score`}
        accentColor={colors.primary}
      />

      {pendingActions.length > 0 || pendingFromApi > 0 ? (
        <IntelligenceCard
          title="Action required"
          subtitle={`${formatMetric(pendingFromApi)} pending approvals`}
          accentColor={colors.warning}
          onPress={() => router.push('/manage/approvals' as never)}
        />
      ) : null}

      <DashboardSection title="Manager quick actions">
        <DashboardQuickAction index={0} title="My Team" subtitle="Team roster and profiles" onPress={() => router.push('/manage/team' as never)} />
        <DashboardQuickAction index={1} title="Team Attendance" subtitle="Today's team status" onPress={() => router.push('/manage/attendance' as never)} />
        <DashboardQuickAction index={2} title="Pending Approvals" subtitle={pendingFromApi > 0 ? `${pendingFromApi} waiting` : 'Leave, WFH, corrections'} onPress={() => router.push('/manage/approvals' as never)} />
        <DashboardQuickAction index={3} title="Team Projects" subtitle="Team project overview" onPress={() => router.push('/(tabs)/projects')} />
        <DashboardQuickAction index={4} title="Team Tasks" subtitle="Review team workload" onPress={() => router.push('/team-tasks' as never)} />
        <DashboardQuickAction index={5} title="Assign Task" subtitle="Create and assign work" onPress={() => router.push('/tasks/create' as never)} />
        <DashboardQuickAction index={6} title="Team Reports" subtitle="Attendance and leave insights" onPress={() => router.push('/reports/team' as never)} />
        <DashboardQuickAction index={7} title="Messages" subtitle={unreadMessages > 0 ? `${unreadMessages} unread` : 'Team conversations'} onPress={() => router.push('/(tabs)/messages')} />
        <DashboardQuickAction index={8} title="Alerts" subtitle={unreadAlerts > 0 ? `${unreadAlerts} unread` : 'Latest updates'} onPress={() => router.push('/alerts')} />
      </DashboardSection>
    </>
  );
}
