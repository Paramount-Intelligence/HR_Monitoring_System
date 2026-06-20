import { StyleSheet, Text, View } from 'react-native';
import type { ConnectionStatus } from '../../realtime/realtime-events';
import { useRealtimeStore } from '../../realtime/realtime-store';
import { colors, spacing, typography } from '../../theme';
import { useNetworkStore } from '../../network/network-store';

interface ConnectionStatusBarProps {
  status: ConnectionStatus;
}

export function ConnectionStatusBar({ status }: ConnectionStatusBarProps) {
  const isOffline = useNetworkStore((s) => s.isOffline);
  const isWeakConnection = useNetworkStore((s) => s.isWeakConnection);

  if (isOffline) {
    return (
      <View style={[styles.bar, styles.offline]}>
        <Text style={styles.text}>You are offline. Messages will sync when connection returns.</Text>
      </View>
    );
  }

  if (isWeakConnection) {
    return (
      <View style={[styles.bar, styles.weak]}>
        <Text style={styles.text}>Weak connection. Updates may take longer.</Text>
      </View>
    );
  }

  if (status === 'connected' || status === 'idle') return null;

  const connectionError = useRealtimeStore((s) => s.connectionError);

  if (connectionError) {
    return (
      <View style={[styles.bar, styles.reconnecting]}>
        <Text style={styles.text}>{connectionError}</Text>
      </View>
    );
  }

  const label =
    status === 'connecting' || status === 'reconnecting'
      ? 'Reconnecting…'
      : 'Disconnected';

  return (
    <View style={[styles.bar, styles.reconnecting]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  offline: {
    backgroundColor: colors.primary,
  },
  weak: {
    backgroundColor: colors.warning,
  },
  reconnecting: {
    backgroundColor: colors.info,
  },
  text: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: 'Inter_600SemiBold',
  },
});
