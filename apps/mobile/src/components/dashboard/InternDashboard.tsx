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
import { LoadingSkeletonList } from '../ui/LoadingSkeleton';
import { getDashboardSummary } from '../../api/dashboard.api';
import { queryKeys } from '../../constants/query-keys';
import { formatDuration, formatTime } from '../../utils/format';
import { colors } from '../../theme';

interface InternDashboardProps {
  unreadMessages: number;
  unreadAlerts: number;
  roleLabel?: string;
}

export function InternDashboard({
  unreadMessages,
  unreadAlerts,
  roleLabel = 'Intern',
}: InternDashboardProps) {
  const router = useRouter();

  const dashboardQuery = useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: getDashboardSummary,
  });

  const summary = dashboardQuery.data;
  const attendance = summary?.attendance;
  const tasks = summary?.tasks;

  if (dashboardQuery.isLoading && !summary) {
    return <LoadingSkeletonList count={3} />;
  }

  if (dashboardQuery.isError) {
    return (
      <ErrorState
        title="Dashboard unavailable"
        message="Unable to load your guided overview."
        onRetry={() => void dashboardQuery.refetch()}
      />
    );
  }

  const workState =
    attendance?.session_status === 'active'
      ? 'Checked In'
      : attendance?.checked_in_today
        ? 'On Record'
        : 'Not Checked In';

  return (
    <>
      <IntelligenceCard
        title="Focus for today"
        subtitle="Check attendance, update assigned tasks, and review messages from your lead."
        accentColor={colors.primary}
      />

      <IntelligenceCard
        title="Attendance"
        subtitle={`${workState} · In ${formatTime(attendance?.check_in_at)} · Out ${formatTime(attendance?.check_out_at)} · ${formatDuration(attendance?.duration_minutes ?? summary?.total_time_today ?? null)}`}
        accentColor={colors.success}
        onPress={() => router.push('/(tabs)/attendance')}
      />

      <DashboardSection title={`${roleLabel} overview`}>
        <DashboardMetricGrid>
          <DashboardMetricItem>
            <DashboardMetricCard index={0} title="Assigned Tasks" value={formatMetric(tasks?.total)} accentColor={colors.primary} />
          </DashboardMetricItem>
          <DashboardMetricItem>
            <DashboardMetricCard index={1} title="Due Soon" value={formatMetric(summary?.tasks_due_soon)} accentColor={colors.warning} />
          </DashboardMetricItem>
          <DashboardMetricItem>
            <DashboardMetricCard index={2} title="In Progress" value={formatMetric(tasks?.in_progress, '0')} accentColor={colors.info} />
          </DashboardMetricItem>
          <DashboardMetricItem>
            <DashboardMetricCard index={3} title="Completed" value={formatMetric(tasks?.completed, '0')} accentColor={colors.success} />
          </DashboardMetricItem>
          <DashboardMetricItem>
            <DashboardMetricCard index={4} title="My Projects" value="—" subtitle="Assigned project work" accentColor={colors.info} />
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
        title="Guidance"
        subtitle="Update your assigned tasks and check messages from your team lead."
        accentColor={colors.info}
      />

      <DashboardSection title="Quick actions">
        <DashboardQuickAction index={0} title="View My Tasks" subtitle="View your work queue" onPress={() => router.push('/(tabs)/tasks')} />
        <DashboardQuickAction index={1} title="View My Projects" subtitle="Assigned project work" onPress={() => router.push('/(tabs)/projects')} />
        <DashboardQuickAction index={2} title="Attendance" subtitle="Check in and history" onPress={() => router.push('/(tabs)/attendance')} />
        <DashboardQuickAction index={3} title="Messages" subtitle={unreadMessages > 0 ? `${unreadMessages} unread` : 'Team conversations'} onPress={() => router.push('/(tabs)/messages')} />
        <DashboardQuickAction index={4} title="Profile" subtitle="Account settings" onPress={() => router.push('/(tabs)/profile')} />
      </DashboardSection>
    </>
  );
}
