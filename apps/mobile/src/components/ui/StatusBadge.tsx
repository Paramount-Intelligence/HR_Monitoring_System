import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { badgePalettes, type BadgeTone } from '../../theme/badgePalettes';
import { radius, spacing, typography } from '../../theme';

export type StatusBadgeVariant = BadgeTone;

interface StatusBadgeProps {
  label: string;
  variant?: StatusBadgeVariant;
  style?: ViewStyle;
}

export function StatusBadge({ label, variant = 'neutral', style }: StatusBadgeProps) {
  const palette = badgePalettes[variant];
  const displayLabel = label.replace(/_/g, ' ');

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg, borderColor: palette.border }, style]}>
      <Text style={[typography.labelSm, styles.label, { color: palette.text }]} numberOfLines={1}>
        {displayLabel.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    maxWidth: '100%',
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
  },
});
