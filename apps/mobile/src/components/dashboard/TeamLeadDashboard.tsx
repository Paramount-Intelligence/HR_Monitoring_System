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
import { queryKeys } from '../../constants/query-keys';
import { colors } from '../../theme';

interface TeamLeadDashboardProps {
  unreadMessages: number;
  unreadAlerts: number;
}

export function TeamLeadDashboard({ unreadMessages, unreadAlerts }: TeamLeadDashboardProps) {
  const router = useRouter();

  const overviewQuery = useQuery({
    queryKey: queryKeys.dashboardManagerOverview,
    queryFn: getManagerOverview,
  });

  const kpis = overviewQuery.data?.kpis;
  const loading = overviewQuery.isLoading;

  if (overviewQuery.isError) {
    return (
      <ErrorState
        title="Team lead dashboard unavailable"
        message="Unable to load assigned team overview."
        onRetry={() => void overviewQuery.refetch()}
      />
    );
  }

  return (
    <>
      <DashboardSection title="Assigned team" subtitle="Delivery & attendance">
        <DashboardMetricGrid>
          <DashboardMetricItem>
            <DashboardMetricCard index={0} title="Team Members" value={formatMetric(kpis?.team_members)} accentColor={colors.primary} loading={loading} />
          </DashboardMetricItem>
          <DashboardMetricItem>
            <DashboardMetricCard index={1} title="Present Today" value={formatMetric(kpis?.present_today)} accentColor={colors.success} loading={loading} />
          </DashboardMetricItem>
          <DashboardMetricItem>
            <DashboardMetricCard index={2} title="Assigned Projects" value={formatMetric(kpis?.projects_in_progress)} subtitle="Team delivery overview" accentColor={colors.info} loading={loading} />
          </DashboardMetricItem>
          <DashboardMetricItem>
            <DashboardMetricCard index={3} title="Team Tasks" value={formatMetric(kpis?.active_tasks)} accentColor={colors.primary} loading={loading} />
          </DashboardMetricItem>
          <DashboardMetricItem>
            <DashboardMetricCard index={4} title="Overdue Tasks" value={formatMetric(kpis?.overdue_tasks)} accentColor={colors.danger} loading={loading} />
          </DashboardMetricItem>
          <DashboardMetricItem>
            <DashboardMetricCard index={5} title="Messages" value={formatMetric(unreadMessages, '0')} accentColor={colors.info} />
          </DashboardMetricItem>
          <DashboardMetricItem>
            <DashboardMetricCard index={6} title="Alerts" value={formatMetric(unreadAlerts, '0')} accentColor={colors.warning} />
          </DashboardMetricItem>
        </DashboardMetricGrid>
      </DashboardSection>

      <IntelligenceCard
        title="Team task focus"
        subtitle={`${formatMetric(kpis?.active_tasks)} in progress · ${formatMetric(kpis?.overdue_tasks)} overdue`}
        accentColor={colors.warning}
      />

      <DashboardSection title="Quick actions">
        <DashboardQuickAction index={0} title="Team Tasks" subtitle="Review team workload" onPress={() => router.push('/team-tasks' as never)} />
        <DashboardQuickAction index={1} title="Team Attendance" subtitle="Today's status" onPress={() => router.push('/manage/attendance' as never)} />
        <DashboardQuickAction index={2} title="Project Progress" subtitle="Team project overview" onPress={() => router.push('/(tabs)/projects')} />
        <DashboardQuickAction index={3} title="Messages" subtitle={unreadMessages > 0 ? `${unreadMessages} unread` : 'Team conversations'} onPress={() => router.push('/(tabs)/messages')} />
        <DashboardQuickAction index={4} title="Alerts" subtitle={unreadAlerts > 0 ? `${unreadAlerts} unread` : 'Latest updates'} onPress={() => router.push('/alerts')} />
      </DashboardSection>
    </>
  );
}
