import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';

type ProgressVariant = 'primary' | 'success' | 'warning' | 'danger';

interface ProgressBarProps {
  progress: number;
  variant?: ProgressVariant;
  showLabel?: boolean;
  compact?: boolean;
  label?: string;
}

const variantColors: Record<ProgressVariant, string> = {
  primary: colors.primary,
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
};

export function ProgressBar({
  progress,
  variant = 'primary',
  showLabel = false,
  compact = false,
  label,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, progress));
  const fillColor = variantColors[variant];

  return (
    <View style={styles.wrap}>
      {(showLabel || label) && (
        <View style={styles.labelRow}>
          {label ? (
            <Text style={[typography.caption, styles.labelText]} numberOfLines={1}>
              {label}
            </Text>
          ) : (
            <View />
          )}
          {showLabel ? (
            <Text style={[typography.labelMd, styles.percent]}>{Math.round(clamped)}%</Text>
          ) : null}
        </View>
      )}
      <View style={[styles.track, compact && styles.trackCompact]}>
        <View
          style={[
            styles.fill,
            compact && styles.fillCompact,
            { width: `${clamped}%`, backgroundColor: fillColor },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  labelText: {
    color: colors.textSecondary,
    flex: 1,
  },
  percent: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
  },
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.neutralTint,
    overflow: 'hidden',
  },
  trackCompact: {
    height: 6,
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  fillCompact: {
    height: 6,
  },
});
