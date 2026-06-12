import { StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Screen } from '../../src/components/ui/Screen';
import { AppHeader } from '../../src/components/layout/AppHeader';
import { AppButton } from '../../src/components/ui/AppButton';
import { NotificationList } from '../../src/components/notifications/NotificationList';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../src/api/notifications.api';
import { queryKeys } from '../../src/constants/query-keys';
import { sortNotifications } from '../../src/utils/notifications';
import { spacing } from '../../src/constants/theme';
import type { Notification } from '../../src/types/notification';
import { useNetworkStore } from '../../src/network/network-store';
import {
  queueMarkAllNotificationsRead,
  queueMarkNotificationRead,
  shouldQueueOnError,
} from '../../src/offline/offline-sync';

export default function NotificationsScreen() {
  const queryClient = useQueryClient();
  const isOffline = useNetworkStore((s) => s.isOffline);

  const notificationsQuery = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => getNotifications(50),
  });

  const markReadMutation = useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(notificationId),
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications });
      queryClient.setQueryData<Notification[]>(queryKeys.notifications, (prev) =>
        prev?.map((item) =>
          item.id === notificationId ? { ...item, is_read: true } : item
        )
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
        queryClient.invalidateQueries({ queryKey: queryKeys.notificationsUnread }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      ]);
    },
    onError: async (error, notificationId) => {
      if (shouldQueueOnError(error)) {
        await queueMarkNotificationRead(notificationId);
        return;
      }
      void notificationsQuery.refetch();
    },
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications });
      queryClient.setQueryData<Notification[]>(queryKeys.notifications, (prev) =>
        prev?.map((item) => ({ ...item, is_read: true }))
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
        queryClient.invalidateQueries({ queryKey: queryKeys.notificationsUnread }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      ]);
    },
    onError: async (error) => {
      if (shouldQueueOnError(error)) {
        await queueMarkAllNotificationsRead();
      } else {
        void notificationsQuery.refetch();
      }
    },
  });

  const notifications = sortNotifications(notificationsQuery.data ?? []);
  const hasUnread = notifications.some((item) => !item.is_read);

  const handlePress = async (notification: Notification) => {
    if (notification.is_read) return;

    if (isOffline) {
      queryClient.setQueryData<Notification[]>(queryKeys.notifications, (prev) =>
        prev?.map((item) =>
          item.id === notification.id ? { ...item, is_read: true } : item
        )
      );
      await queueMarkNotificationRead(notification.id);
      return;
    }

    markReadMutation.mutate(notification.id);
  };

  const handleMarkAll = async () => {
    if (isOffline) {
      queryClient.setQueryData<Notification[]>(queryKeys.notifications, (prev) =>
        prev?.map((item) => ({ ...item, is_read: true }))
      );
      await queueMarkAllNotificationsRead();
      return;
    }
    markAllMutation.mutate();
  };

  const showError = notificationsQuery.isError && !notifications.length;

  return (
    <Screen scroll={false} contentStyle={styles.content} withTabBarInset>
      <AppHeader title="Alerts" subtitle="Your latest updates" />

      {hasUnread ? (
        <AppButton
          title="Mark all read"
          variant="secondary"
          loading={markAllMutation.isPending}
          onPress={() => void handleMarkAll()}
          style={styles.markAll}
        />
      ) : null}

      <View style={styles.listWrap}>
        <NotificationList
          notifications={notifications}
          loading={notificationsQuery.isLoading}
          refreshing={notificationsQuery.isRefetching}
          error={showError}
          onRefresh={() => {
            if (!isOffline) void notificationsQuery.refetch();
          }}
          onRetry={() => void notificationsQuery.refetch()}
          onPressNotification={(notification) => void handlePress(notification)}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingBottom: spacing.sm,
  },
  markAll: {
    marginBottom: spacing.sm,
  },
  listWrap: {
    flex: 1,
  },
});
