import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AttendanceSession } from '../../types/attendance';
import {
  getHistoryAccentColor,
  getHistoryDurationLabel,
  getHistoryTimeRange,
  getSessionStatusDisplay,
} from '../../utils/attendance-formatters';
import { formatDate } from '../../utils/format';
import { StatusBadge } from '../ui/StatusBadge';
import { colors, radius, spacing, typography } from '../../theme';

interface AttendanceHistoryCardProps {
  session: AttendanceSession;
  onPress?: () => void;
  isLast?: boolean;
}

export function AttendanceHistoryCard({ session, onPress, isLast = false }: AttendanceHistoryCardProps) {
  const accentColor = getHistoryAccentColor(session);
  const status = getSessionStatusDisplay(session);
  const timeRange = getHistoryTimeRange(session);
  const duration = getHistoryDurationLabel(session);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [pressed && onPress && styles.pressed]}
    >
      <View style={[styles.row, !isLast && styles.rowBorder]}>
        <View style={[styles.accent, { backgroundColor: accentColor }]} />
        <View style={styles.content}>
          <View style={styles.left}>
            <Text style={[typography.bodyMd, styles.date]}>{formatDate(session.check_in_at)}</Text>
            <Text style={[typography.caption, styles.timeRange]}>{timeRange}</Text>
          </View>
          <View style={styles.right}>
            <StatusBadge label={status.label} variant={status.variant} />
            <Text style={[typography.caption, styles.duration]}>{duration}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  accent: {
    width: 4,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  left: {
    flex: 1,
    minWidth: 0,
  },
  date: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
  },
  timeRange: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
    gap: spacing.xs,
    flexShrink: 0,
  },
  duration: {
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.92,
  },
});
