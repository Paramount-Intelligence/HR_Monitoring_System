import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { badgePalettes, colors, radii, spacing } from '../constants/theme';
import { useNetworkStore } from './network-store';

interface ConnectionQualityBadgeProps {
  compact?: boolean;
}

export function ConnectionQualityBadge({ compact = false }: ConnectionQualityBadgeProps) {
  const isOffline = useNetworkStore((s) => s.isOffline);
  const isWeakConnection = useNetworkStore((s) => s.isWeakConnection);

  if (!isOffline && !isWeakConnection) return null;

  const label = isOffline ? 'Offline' : 'Weak connection';
  const icon = isOffline ? 'cloud-offline-outline' : 'cellular-outline';
  const palette = isOffline ? badgePalettes.danger : badgePalettes.warning;

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg, borderColor: palette.border }, compact && styles.compact]}>
      <Ionicons name={icon} size={12} color={palette.text} />
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  compact: {
    marginBottom: 0,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
  },
});
