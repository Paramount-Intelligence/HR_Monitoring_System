import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  DashboardMetricCard,
  DashboardQuickAction,
  DashboardSection,
} from './index';
import { ErrorState } from '../ui/ErrorState';
import { getDashboardSummary } from '../../api/dashboard.api';
import { queryKeys } from '../../constants/query-keys';
import { formatDuration, formatTime } from '../../utils/format';
import { colors, spacing } from '../../constants/theme';
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

  if (dashboardQuery.isError) {
    return (
      <ErrorState
        message="Unable to load dashboard."
        onRetry={() => void dashboardQuery.refetch()}
      />
    );
  }

  const workState =
    attendance?.session_status === 'active'
      ? 'Checked In'
      : attendance?.checked_in_today && attendance.check_out_at
        ? 'Session Closed'
        : 'Not Checked In';

  return (
    <>
      <DashboardSection title={`Today at a glance · ${roleLabel}`}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          <DashboardMetricCard
            index={0}
            title="Attendance"
            value={dashboardQuery.isLoading ? '…' : workState}
            subtitle={attendance?.work_mode?.toUpperCase() ?? '—'}
            accentColor={colors.primary}
          />
          <DashboardMetricCard
            index={1}
            title="Duration"
            value={formatDuration(attendance?.duration_minutes ?? summary?.total_time_today ?? null)}
            subtitle="Worked today"
            accentColor={colors.success}
          />
          <DashboardMetricCard
            index={2}
            title="Check In"
            value={formatTime(attendance?.check_in_at)}
            accentColor={colors.info}
          />
          <DashboardMetricCard
            index={3}
            title="Check Out"
            value={formatTime(attendance?.check_out_at)}
            accentColor={colors.warning}
          />
          <DashboardMetricCard
            index={4}
            title="Messages"
            value={String(unreadMessages)}
            accentColor={colors.info}
          />
          <DashboardMetricCard
            index={5}
            title="Alerts"
            value={String(unreadAlerts)}
            accentColor={colors.warning}
          />
        </View>
      </DashboardSection>

      <DashboardSection title="Quick actions">
        <DashboardQuickAction
          index={0}
          title="View Attendance"
          subtitle="Today status and history"
          onPress={() => router.push('/(tabs)/attendance')}
        />
        <DashboardQuickAction
          index={1}
          title="View Messages"
          subtitle={unreadMessages > 0 ? `${unreadMessages} unread` : 'Team conversations'}
          onPress={() => router.push('/(tabs)/messages')}
        />
        <DashboardQuickAction
          index={2}
          title="View Alerts"
          subtitle={unreadAlerts > 0 ? `${unreadAlerts} unread` : 'Latest updates'}
          onPress={() => router.push('/(tabs)/notifications')}
        />
        <DashboardQuickAction
          index={3}
          title="View Profile"
          subtitle="Account and photo"
          onPress={() => router.push('/(tabs)/profile')}
        />
        <DashboardQuickAction
          index={4}
          title="My Reports"
          subtitle="Attendance and leave insights"
          onPress={() => router.push('/reports/employee' as never)}
        />
      </DashboardSection>
    </>
  );
}

export type { EmployeeDashboardData };
