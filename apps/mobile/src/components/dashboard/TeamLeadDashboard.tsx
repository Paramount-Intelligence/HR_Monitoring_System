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
import { queryKeys } from '../../constants/query-keys';
import { colors, spacing } from '../../constants/theme';

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

  if (overviewQuery.isError) {
    return (
      <ErrorState
        message="Unable to load team lead dashboard."
        onRetry={() => void overviewQuery.refetch()}
      />
    );
  }

  return (
    <>
      <DashboardSection title="Team summary">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          <DashboardMetricCard
            index={0}
            title="Team Members"
            value={String(kpis?.team_members ?? '…')}
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
            title="Messages"
            value={String(unreadMessages)}
            subtitle="Unread"
            accentColor={colors.info}
          />
          <DashboardMetricCard
            index={3}
            title="Alerts"
            value={String(unreadAlerts)}
            subtitle="Unread"
            accentColor={colors.warning}
          />
        </View>
      </DashboardSection>

      <DashboardSection title="Quick actions">
        <DashboardQuickAction
          index={0}
          title="My Team"
          subtitle="Team roster"
          onPress={() => router.push('/manage/team' as never)}
        />
        <DashboardQuickAction
          index={1}
          title="Team Attendance"
          subtitle="Today's status"
          onPress={() => router.push('/manage/attendance' as never)}
        />
        <DashboardQuickAction
          index={2}
          title="Messages"
          subtitle={unreadMessages > 0 ? `${unreadMessages} unread` : 'Team conversations'}
          onPress={() => router.push('/(tabs)/messages')}
        />
        <DashboardQuickAction
          index={3}
          title="Alerts"
          subtitle={unreadAlerts > 0 ? `${unreadAlerts} unread` : 'Latest updates'}
          onPress={() => router.push('/(tabs)/notifications')}
        />
      </DashboardSection>
    </>
  );
}
