import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

const priorityConfig: Record<
  TaskPriority,
  { label: string; bg: string; text: string; border: string }
> = {
  low: {
    label: 'LOW',
    bg: colors.neutralTint,
    text: colors.textSecondary,
    border: colors.border,
  },
  medium: {
    label: 'MEDIUM',
    bg: colors.infoTint,
    text: colors.info,
    border: 'rgba(59, 130, 246, 0.25)',
  },
  high: {
    label: 'HIGH',
    bg: colors.warningTint,
    text: colors.warning,
    border: 'rgba(245, 158, 11, 0.25)',
  },
  critical: {
    label: 'CRITICAL',
    bg: colors.dangerTint,
    text: colors.danger,
    border: 'rgba(239, 68, 68, 0.25)',
  },
};

interface PriorityBadgeProps {
  priority: TaskPriority | string;
  style?: ViewStyle;
}

export function PriorityBadge({ priority, style }: PriorityBadgeProps) {
  const key = (priority?.toLowerCase() ?? 'medium') as TaskPriority;
  const config = priorityConfig[key] ?? priorityConfig.medium;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bg, borderColor: config.border },
        style,
      ]}
    >
      <Text style={[typography.labelSm, styles.label, { color: config.text }]}>
        {config.label}
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
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
  },
});
