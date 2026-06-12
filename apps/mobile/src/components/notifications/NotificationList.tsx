import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import type { Notification } from '../../types/notification';
import { NotificationCard } from './NotificationCard';
import { AppEmptyState } from '../ui/AppEmptyState';
import { AppErrorState } from '../ui/AppErrorState';
import { AppLoadingState } from '../ui/AppLoadingState';
import { colors, spacing } from '../../constants/theme';

interface NotificationListProps {
  notifications: Notification[];
  loading?: boolean;
  refreshing?: boolean;
  error?: boolean;
  onRefresh?: () => void;
  onRetry?: () => void;
  onPressNotification: (notification: Notification) => void;
}

export function NotificationList({
  notifications,
  loading = false,
  refreshing = false,
  error = false,
  onRefresh,
  onRetry,
  onPressNotification,
}: NotificationListProps) {
  if (error) {
    return <AppErrorState onRetry={onRetry} />;
  }

  if (loading && !notifications.length) {
    return <AppLoadingState />;
  }

  if (!notifications.length) {
    return (
      <AppEmptyState
        title="No alerts yet."
        description="Updates about tasks, messages, and approvals will appear here."
      />
    );
  }

  return (
    <FlatList
      data={notifications}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => (
        <NotificationCard
          notification={item}
          index={index}
          onPress={() => onPressNotification(item)}
        />
      )}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        ) : undefined
      }
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: spacing.lg,
  },
});
