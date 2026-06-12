import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { badgePalettes, colors, radii, spacing, type BadgeTone } from '../../constants/theme';

export type AppBadgeVariant = BadgeTone;

interface AppBadgeProps {
  label: string;
  variant?: AppBadgeVariant;
  style?: ViewStyle;
}

export function AppBadge({ label, variant = 'default', style }: AppBadgeProps) {
  const palette = badgePalettes[variant];
  const displayLabel = label.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg, borderColor: palette.border }, style]}>
      <Text style={[styles.label, { color: palette.text }]} numberOfLines={1}>
        {displayLabel}
      </Text>
    </View>
  );
}

export function AppBadgeWithIcon({
  label,
  variant = 'default',
  icon,
}: {
  label: string;
  variant?: AppBadgeVariant;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  const palette = badgePalettes[variant];
  return (
    <View style={[styles.badge, styles.row, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Ionicons name={icon} size={12} color={palette.text} />
      <Text style={[styles.label, { color: palette.text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    maxWidth: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
});
