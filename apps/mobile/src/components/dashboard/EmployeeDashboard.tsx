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
import type { EmployeeDashboard as EmployeeDashboardData } from '../../types/dashboard';

interface EmployeeDashboardProps {
  unreadMessages: number;
  unreadAlerts: number;
  roleLabel?: string;
}

export function EmployeeDashboard({
  unreadMessages,
  unreadAlerts,
  roleLabel = 'Employee',
}: EmployeeDashboardProps) {
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
        message="Unable to load your workday summary."
        onRetry={() => void dashboardQuery.refetch()}
      />
    );
  }

  const workState =
    attendance?.session_status === 'active'
      ? 'Checked In'
      : attendance?.checked_in_today && attendance.check_out_at
        ? 'Session Closed'
        : attendance?.checked_in_today
          ? 'Checked In'
          : 'Not Checked In';

  return (
    <>
      <IntelligenceCard
        index={0}
        title="Today's attendance"
        subtitle={`${workState} · ${attendance?.work_mode?.toUpperCase() ?? '—'} · ${formatDuration(attendance?.duration_minutes ?? summary?.total_time_today ?? null)} worked`}
        accentColor={workState === 'Checked In' ? colors.success : colors.primary}
        onPress={() => router.push('/(tabs)/attendance')}
      />

      <DashboardSection index={1} title={`Today at a glance · ${roleLabel}`}>
        <DashboardMetricGrid>
          <DashboardMetricItem>
            <DashboardMetricCard index={0} title="Check In" value={formatTime(attendance?.check_in_at)} accentColor={colors.info} />
          </DashboardMetricItem>
          <DashboardMetricItem>
            <DashboardMetricCard index={1} title="Check Out" value={formatTime(attendance?.check_out_at)} accentColor={colors.warning} />
          </DashboardMetricItem>
          <DashboardMetricItem>
            <DashboardMetricCard index={2} title="My Tasks" value={formatMetric(tasks?.total)} subtitle={`${formatMetric(tasks?.in_progress, '0')} in progress`} accentColor={colors.primary} />
          </DashboardMetricItem>
          <DashboardMetricItem>
            <DashboardMetricCard index={3} title="Due Soon" value={formatMetric(summary?.tasks_due_soon)} accentColor={colors.warning} />
          </DashboardMetricItem>
          <DashboardMetricItem>
            <DashboardMetricCard index={4} title="Overdue" value={formatMetric(tasks?.overdue, '0')} accentColor={colors.danger} />
          </DashboardMetricItem>
          <DashboardMetricItem>
            <DashboardMetricCard index={5} title="Completed" value={formatMetric(tasks?.completed, '0')} accentColor={colors.success} />
          </DashboardMetricItem>
          <DashboardMetricItem>
            <DashboardMetricCard index={6} title="My Projects" value="—" subtitle="Assigned project work" accentColor={colors.info} />
          </DashboardMetricItem>
          <DashboardMetricItem>
            <DashboardMetricCard index={7} title="Messages" value={formatMetric(unreadMessages, '0')} accentColor={colors.info} />
          </DashboardMetricItem>
          <DashboardMetricItem>
            <DashboardMetricCard index={8} title="Alerts" value={formatMetric(unreadAlerts, '0')} accentColor={colors.warning} />
          </DashboardMetricItem>
        </DashboardMetricGrid>
      </DashboardSection>

      <IntelligenceCard
        index={2}
        title="My work"
        subtitle={`${formatMetric(tasks?.in_progress, '0')} tasks in progress · ${formatMetric(tasks?.blocked, '0')} blocked`}
        accentColor={colors.primary}
        onPress={() => router.push('/(tabs)/tasks')}
      />

      <DashboardSection index={3} title="Quick actions">
        <DashboardQuickAction index={0} title="Check Attendance" subtitle="View status and history" onPress={() => router.push('/(tabs)/attendance')} />
        <DashboardQuickAction index={1} title="My Tasks" subtitle="View your work queue" onPress={() => router.push('/(tabs)/tasks')} />
        <DashboardQuickAction index={2} title="My Projects" subtitle="Assigned project work" onPress={() => router.push('/(tabs)/projects')} />
        <DashboardQuickAction index={3} title="Messages" subtitle={unreadMessages > 0 ? `${unreadMessages} unread` : 'Team conversations'} onPress={() => router.push('/(tabs)/messages')} />
        <DashboardQuickAction index={4} title="Profile" subtitle="Account and settings" onPress={() => router.push('/(tabs)/profile')} />
        <DashboardQuickAction index={5} title="Alerts" subtitle={unreadAlerts > 0 ? `${unreadAlerts} unread` : 'Latest updates'} onPress={() => router.push('/alerts')} />
      </DashboardSection>
    </>
  );
}

export type { EmployeeDashboardData };
