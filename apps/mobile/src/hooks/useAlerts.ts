import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAlerts, resolveAlert } from '../api/alerts.api';
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/notifications.api';
import { queryKeys } from '../constants/query-keys';
import type { AlertFilterId, AlertViewModel } from '../types/alert';
import type { Notification } from '../types/notification';
import { mergeAlertFeed, matchesAlertFilter } from '../utils/alert-adapters';
import {
  queueMarkAllNotificationsRead,
  queueMarkNotificationRead,
  shouldQueueOnError,
} from '../offline/offline-sync';

function invalidateAlertQueries(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.alerts() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.alertsOpenCount }),
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
    queryClient.invalidateQueries({ queryKey: queryKeys.notificationsUnread }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
  ]);
}

export function useAlertsFeed() {
  const alertsQuery = useQuery({
    queryKey: queryKeys.alerts(),
    queryFn: getAlerts,
  });

  const notificationsQuery = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => getNotifications(50),
  });

  const feed: AlertViewModel[] =
    alertsQuery.data != null || notificationsQuery.data != null
      ? mergeAlertFeed(alertsQuery.data ?? [], notificationsQuery.data ?? [])
      : [];

  const isLoading =
    (alertsQuery.isLoading && !alertsQuery.data) ||
    (notificationsQuery.isLoading && !notificationsQuery.data);

  const isError =
    feed.length === 0 &&
    !isLoading &&
    (alertsQuery.isError || notificationsQuery.isError);

  const refetch = async () => {
    await Promise.all([alertsQuery.refetch(), notificationsQuery.refetch()]);
  };

  return {
    feed,
    isLoading,
    isError,
    isRefetching: alertsQuery.isRefetching || notificationsQuery.isRefetching,
    refetch,
  };
}

export function useFilteredAlerts(filter: AlertFilterId) {
  const { feed, ...rest } = useAlertsFeed();
  const filtered = feed.filter((item) => matchesAlertFilter(item, filter));
  return { alerts: filtered, feed, ...rest };
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: queryKeys.notificationsUnread,
    queryFn: getUnreadNotificationCount,
  });
}

export function useOpenAlertsCount() {
  return useQuery({
    queryKey: queryKeys.alertsOpenCount,
    queryFn: async () => {
      const alerts = await getAlerts();
      return alerts.filter((a) => String(a.status).toLowerCase() === 'open').length;
    },
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId: string) => resolveAlert(alertId),
    onSuccess: async () => {
      await invalidateAlertQueries(queryClient);
    },
  });
}

export function useMarkAlertRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(notificationId),
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications });
      queryClient.setQueryData<Notification[]>(queryKeys.notifications, (prev) =>
        prev?.map((item) => (item.id === notificationId ? { ...item, is_read: true } : item))
      );
    },
    onSuccess: async () => {
      await invalidateAlertQueries(queryClient);
    },
    onError: async (error, notificationId) => {
      if (shouldQueueOnError(error)) {
        await queueMarkNotificationRead(notificationId);
      }
    },
  });
}

export function useMarkAllAlertsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications });
      queryClient.setQueryData<Notification[]>(queryKeys.notifications, (prev) =>
        prev?.map((item) => ({ ...item, is_read: true }))
      );
    },
    onSuccess: async () => {
      await invalidateAlertQueries(queryClient);
    },
    onError: async (error) => {
      if (shouldQueueOnError(error)) {
        await queueMarkAllNotificationsRead();
      }
    },
  });
}

export function useDismissAlertItem() {
  const resolveMutation = useResolveAlert();
  const markReadMutation = useMarkAlertRead();

  return {
    dismiss: (item: AlertViewModel) => {
      if (item.source === 'alert') {
        return resolveMutation.mutateAsync(item.id);
      }
      return markReadMutation.mutateAsync(item.id);
    },
    isPending: resolveMutation.isPending || markReadMutation.isPending,
  };
}
