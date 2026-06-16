import { useCallback } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Screen } from '../../src/components/ui/Screen';
import { DashboardHeader } from '../../src/components/dashboard/DashboardHeader';
import { DashboardRouter } from '../../src/components/dashboard/DashboardRouter';
import { useAuthStore } from '../../src/auth/auth-store';
import { getUnreadCount } from '../../src/api/messages.api';
import { getUnreadNotificationCount } from '../../src/api/notifications.api';
import { queryKeys } from '../../src/constants/query-keys';
import { getProfilePictureUrl } from '../../src/utils/media-url';
import { useTabScreenBottomInset } from '../../src/hooks/useTabScreenBottomInset';
import { useNetworkStore } from '../../src/network/network-store';
import { OfflineQueueStatus } from '../../src/offline/OfflineQueueStatus';
import { resolveDashboardRole, getDashboardRoleLabel } from '../../src/auth/role-utils';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing } from '../../src/theme';

const SECTION_TITLES: Record<string, string> = {
  admin: 'Workforce control',
  hr_operations: 'HR operations',
  manager: 'Team overview',
  team_lead: 'Team delivery',
  employee: 'Today at a glance',
  intern: 'Your day',
};

export default function DashboardScreen() {
  const queryClient = useQueryClient();
  const tabBottomInset = useTabScreenBottomInset();
  const user = useAuthStore((s) => s.user);
  const dashboardRole = resolveDashboardRole(user?.role);
  const roleLabel = getDashboardRoleLabel(dashboardRole);
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
      queryClient.invalidateQueries({ queryKey: queryKeys.pendingLeaves }),
      queryClient.invalidateQueries({ queryKey: queryKeys.pendingCorrections }),
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount }),
      queryClient.invalidateQueries({ queryKey: queryKeys.notificationsUnread }),
    ]);
  }, [queryClient]);

  const refreshing =
    messagesUnreadQuery.isRefetching ||
    alertsUnreadQuery.isRefetching;

  return (
    <Screen scroll={false} withTabBarInset edges={['top', 'left', 'right']} style={styles.screen}>
      <DashboardHeader
        user={user}
        imageUrl={imageUrl}
        unreadAlerts={unreadAlerts}
        dashboardRole={dashboardRole}
        sectionTitle={SECTION_TITLES[dashboardRole] ?? 'Overview'}
      />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBottomInset }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <OfflineQueueStatus />
        <DashboardRouter
          role={dashboardRole}
          roleLabel={roleLabel}
          unreadMessages={unreadMessages}
          unreadAlerts={unreadAlerts}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    flexGrow: 1,
  },
});
