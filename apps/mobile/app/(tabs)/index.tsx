import { useCallback } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Screen } from '../../src/components/ui/Screen';
import { DashboardHeader } from '../../src/components/dashboard/DashboardHeader';
import { AdminDashboard } from '../../src/components/dashboard/AdminDashboard';
import { HRDashboard } from '../../src/components/dashboard/HRDashboard';
import { ManagerDashboard } from '../../src/components/dashboard/ManagerDashboard';
import { TeamLeadDashboard } from '../../src/components/dashboard/TeamLeadDashboard';
import { EmployeeDashboard } from '../../src/components/dashboard/EmployeeDashboard';
import { InternDashboard } from '../../src/components/dashboard/InternDashboard';
import { useAuthStore } from '../../src/auth/auth-store';
import { getUnreadCount } from '../../src/api/messages.api';
import { getUnreadNotificationCount } from '../../src/api/notifications.api';
import { queryKeys } from '../../src/constants/query-keys';
import { getProfilePictureUrl } from '../../src/utils/media-url';
import { colors } from '../../src/constants/theme';
import { TAB_SCREEN_BOTTOM_INSET } from '../../src/constants/layout';
import { useNetworkStore } from '../../src/network/network-store';
import { OfflineQueueStatus } from '../../src/offline/OfflineQueueStatus';
import { resolveDashboardRole, getDashboardRoleLabel } from '../../src/auth/role-utils';
import { useQuery } from '@tanstack/react-query';

export default function DashboardScreen() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const dashboardRole = resolveDashboardRole(user?.role);
  const imageUrl = getProfilePictureUrl(user);

  const messagesUnreadQuery = useQuery({
    queryKey: queryKeys.unreadCount,
    queryFn: getUnreadCount,
  });

  const alertsUnreadQuery = useQuery({
    queryKey: queryKeys.notificationsUnread,
    queryFn: getUnreadNotificationCount,
  });

  const unreadMessages = messagesUnreadQuery.data?.unread_messages ?? 0;
  const unreadAlerts = alertsUnreadQuery.data ?? 0;

  const onRefresh = useCallback(async () => {
    if (useNetworkStore.getState().isOffline) {
      Alert.alert('Offline', 'No internet connection.');
      return;
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardAdmin }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardAdminAnalytics }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardManagerOverview }),
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount }),
      queryClient.invalidateQueries({ queryKey: queryKeys.notificationsUnread }),
    ]);
  }, [queryClient]);

  const refreshing = messagesUnreadQuery.isRefetching || alertsUnreadQuery.isRefetching;

  const body =
    dashboardRole === 'admin' ? (
      <AdminDashboard unreadMessages={unreadMessages} unreadAlerts={unreadAlerts} />
    ) : dashboardRole === 'hr_operations' ? (
      <HRDashboard unreadMessages={unreadMessages} unreadAlerts={unreadAlerts} />
    ) : dashboardRole === 'manager' ? (
      <ManagerDashboard unreadMessages={unreadMessages} unreadAlerts={unreadAlerts} />
    ) : dashboardRole === 'team_lead' ? (
      <TeamLeadDashboard unreadMessages={unreadMessages} unreadAlerts={unreadAlerts} />
    ) : dashboardRole === 'intern' ? (
      <InternDashboard
        unreadMessages={unreadMessages}
        unreadAlerts={unreadAlerts}
        roleLabel={getDashboardRoleLabel(dashboardRole)}
      />
    ) : (
      <EmployeeDashboard
        unreadMessages={unreadMessages}
        unreadAlerts={unreadAlerts}
        roleLabel={getDashboardRoleLabel(dashboardRole)}
      />
    );

  return (
    <Screen scroll={false} withTabBarInset edges={['left', 'right', 'bottom']}>
      <DashboardHeader user={user} imageUrl={imageUrl} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <OfflineQueueStatus />
        {body}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: TAB_SCREEN_BOTTOM_INSET,
  },
});
