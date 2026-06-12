import { StyleSheet, Text, View } from 'react-native';
import type { ConnectionStatus } from '../../realtime/realtime-events';
import { colors, spacing } from '../../constants/theme';
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

  const label =
    status === 'connecting' || status === 'reconnecting'
      ? 'Reconnecting…'
      : 'Disconnected';

  return (
    <View style={styles.bar}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.warning,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  offline: {
    backgroundColor: colors.primaryDark,
  },
  weak: {
    backgroundColor: colors.warningText,
  },
  text: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
