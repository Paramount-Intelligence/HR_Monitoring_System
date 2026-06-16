import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import type { AlertViewModel } from '../../types/alert';
import { FadeSlideIn } from '../../animations/FadeSlideIn';
import { AlertCard } from './AlertCard';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { LoadingSkeletonList } from '../ui/LoadingSkeleton';
import { colors, spacing } from '../../theme';

interface AlertListProps {
  alerts: AlertViewModel[];
  loading?: boolean;
  refreshing?: boolean;
  error?: boolean;
  dismissingId?: string | null;
  onRefresh?: () => void;
  onRetry?: () => void;
  onPressAlert: (alert: AlertViewModel) => void;
  onDismissAlert?: (alert: AlertViewModel) => void;
}

export function AlertList({
  alerts,
  loading = false,
  refreshing = false,
  error = false,
  dismissingId = null,
  onRefresh,
  onRetry,
  onPressAlert,
  onDismissAlert,
}: AlertListProps) {
  if (error) {
    return (
      <ErrorState
        title="Alerts unavailable"
        message="Unable to load alerts. Please try again."
        onRetry={onRetry}
      />
    );
  }

  if (loading && !alerts.length) {
    return <LoadingSkeletonList count={5} />;
  }

  if (!alerts.length) {
    return (
      <EmptyState
        title="No alerts yet"
        description="Workforce alerts and notifications will appear here."
        icon="notifications-outline"
      />
    );
  }

  return (
    <FlatList
      data={alerts}
      keyExtractor={(item) => `${item.source}-${item.id}`}
      renderItem={({ item, index }) => (
        <FadeSlideIn index={Math.min(index, 7)} translateY={8}>
          <AlertCard
            alert={item}
            onPress={() => onPressAlert(item)}
            onDismiss={onDismissAlert ? () => onDismissAlert(item) : undefined}
            dismissing={dismissingId === item.id}
          />
        </FadeSlideIn>
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
    paddingBottom: spacing.xxl,
  },
});
