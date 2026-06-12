import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../constants/theme';
import { useOfflineQueueStore } from '../offline/offline-queue-store';
import { runOfflineSync } from '../offline/offline-sync';
import { useNetworkStore } from '../network/network-store';

export function OfflineQueueStatus() {
  const pendingCount = useOfflineQueueStore(
    (s) => s.items.filter((i) => i.status === 'queued' || i.status === 'syncing').length
  );
  const failedCount = useOfflineQueueStore((s) => s.items.filter((i) => i.status === 'failed').length);
  const isSyncing = useOfflineQueueStore((s) => s.isSyncing);
  const isOffline = useNetworkStore((s) => s.isOffline);

  if (pendingCount === 0 && failedCount === 0) return null;

  let message: string;
  if (isSyncing) {
    message = `Syncing ${pendingCount} item${pendingCount === 1 ? '' : 's'}…`;
  } else if (failedCount > 0) {
    message = `${failedCount} item${failedCount === 1 ? '' : 's'} failed to sync`;
  } else {
    message = `${pendingCount} item${pendingCount === 1 ? '' : 's'} pending sync`;
  }

  const handlePress = () => {
    if (!isOffline) {
      void runOfflineSync();
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={message}
      onPress={handlePress}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
    >
      <Ionicons
        name={failedCount > 0 ? 'warning-outline' : isSyncing ? 'sync-outline' : 'time-outline'}
        size={14}
        color={failedCount > 0 ? colors.danger : colors.primary}
      />
      <Text style={[styles.text, failedCount > 0 && styles.textFailed]}>{message}</Text>
      {!isOffline && !isSyncing ? (
        <Text style={styles.action}>Tap to sync</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.overlay,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.9,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  textFailed: {
    color: colors.danger,
  },
  action: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
});
