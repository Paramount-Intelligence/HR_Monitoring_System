import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../src/components/ui/Screen';
import { BrandHeader } from '../src/components/brand/BrandHeader';
import { AppButton } from '../src/components/ui/AppButton';
import { OfflineBanner } from '../src/components/ui/OfflineBanner';
import { AlertFilters, AlertList } from '../src/components/alerts';
import {
  useDismissAlertItem,
  useFilteredAlerts,
  useMarkAllAlertsRead,
  useOpenAlertsCount,
  useUnreadNotificationCount,
} from '../src/hooks/useAlerts';
import type { AlertFilterId, AlertViewModel } from '../src/types/alert';
import { useNetworkStore } from '../src/network/network-store';
import { colors, spacing, typography } from '../src/theme';
import { Text } from 'react-native';

export default function AlertsScreen() {
  const router = useRouter();
  const isOffline = useNetworkStore((s) => s.isOffline);
  const [selectedFilter, setSelectedFilter] = useState<AlertFilterId>('all');
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  const unreadQuery = useUnreadNotificationCount();
  const openAlertsQuery = useOpenAlertsCount();
  const { alerts, feed, isLoading, isError, isRefetching, refetch } =
    useFilteredAlerts(selectedFilter);
  const markAllMutation = useMarkAllAlertsRead();
  const { dismiss } = useDismissAlertItem();

  const unreadNotifications = unreadQuery.data ?? 0;
  const openAlerts = openAlertsQuery.data ?? 0;
  const totalUnread = unreadNotifications + openAlerts;

  const hasUnreadNotifications = useMemo(
    () => feed.some((item) => item.source === 'notification' && !item.isRead),
    [feed]
  );

  const subtitle = useMemo(() => {
    if (totalUnread <= 0) return 'Notification center';
    const parts: string[] = [];
    if (openAlerts > 0) parts.push(`${openAlerts} open alert${openAlerts === 1 ? '' : 's'}`);
    if (unreadNotifications > 0) {
      parts.push(`${unreadNotifications} unread notification${unreadNotifications === 1 ? '' : 's'}`);
    }
    return parts.join(' · ');
  }, [openAlerts, totalUnread, unreadNotifications]);

  const navigateAlert = (item: AlertViewModel) => {
    if (item.routeTarget) {
      router.push(item.routeTarget as never);
    }
  };

  const handlePress = async (item: AlertViewModel) => {
    if (!item.isRead && !item.isResolved && !isOffline) {
      try {
        setDismissingId(item.id);
        await dismiss(item);
      } catch {
        Alert.alert('Unable to update', 'Could not mark this alert as read.');
      } finally {
        setDismissingId(null);
      }
    }
    navigateAlert(item);
  };

  const handleDismiss = async (item: AlertViewModel) => {
    if (isOffline) {
      Alert.alert('Offline', 'Connect to the internet to update alerts.');
      return;
    }
    try {
      setDismissingId(item.id);
      await dismiss(item);
    } catch {
      Alert.alert('Unable to update', 'Could not update this alert.');
    } finally {
      setDismissingId(null);
    }
  };

  const handleMarkAllRead = () => {
    if (isOffline) {
      Alert.alert('Offline', 'Connect to the internet to mark notifications read.');
      return;
    }
    if (!hasUnreadNotifications) return;
    markAllMutation.mutate(undefined, {
      onError: () => Alert.alert('Unable to update', 'Could not mark all notifications read.'),
    });
  };

  const onRefresh = () => {
    if (isOffline) {
      Alert.alert('Offline', 'No internet connection.');
      return;
    }
    void refetch();
  };

  return (
    <Screen scroll={false} headerSafeArea edges={['left', 'right', 'bottom']} contentStyle={styles.content}>
      <OfflineBanner />
      <BrandHeader
        title="Alerts"
        subtitle={subtitle}
        onBack={() => router.back()}
        centerTitle
      />

      <View style={styles.filters}>
        <AlertFilters selectedId={selectedFilter} onSelect={setSelectedFilter} />
      </View>

      {hasUnreadNotifications ? (
        <AppButton
          title="Mark all notifications read"
          variant="secondary"
          loading={markAllMutation.isPending}
          disabled={isOffline}
          onPress={handleMarkAllRead}
          style={styles.markAll}
        />
      ) : null}

      {selectedFilter !== 'all' && !alerts.length && !isLoading ? (
        <View style={styles.emptyFilter}>
          <Text style={[typography.bodyMd, styles.emptyFilterText]}>
            No alerts in this category.
          </Text>
        </View>
      ) : null}

      <View style={styles.listWrap}>
        <AlertList
          alerts={alerts}
          loading={isLoading}
          refreshing={isRefetching}
          error={isError}
          dismissingId={dismissingId}
          onRefresh={onRefresh}
          onRetry={() => void refetch()}
          onPressAlert={(item) => void handlePress(item)}
          onDismissAlert={(item) => void handleDismiss(item)}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filters: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.md,
  },
  markAll: {
    marginHorizontal: spacing.screenPadding,
    marginBottom: spacing.sm,
  },
  listWrap: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
  },
  emptyFilter: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.sm,
  },
  emptyFilterText: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
