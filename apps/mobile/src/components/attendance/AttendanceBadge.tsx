import { StyleSheet, Text, View } from 'react-native';
import type { AttendanceClassification } from '../../types/attendance';
import { getClassificationLabel } from '../../utils/attendance';
import { badgePalettes, radii, spacing, type BadgeTone } from '../../constants/theme';

interface AttendanceBadgeProps {
  status: AttendanceClassification | string;
  size?: 'sm' | 'md';
}

function getTone(status: string): BadgeTone {
  switch (status) {
    case 'full_day':
    case 'present':
      return 'success';
    case 'half_day':
    case 'short_leave':
      return 'warning';
    case 'full_leave':
    case 'leave':
    case 'absent':
      return 'danger';
    case 'active':
      return 'info';
    case 'insufficient':
      return 'neutral';
    default:
      return 'neutral';
  }
}

export function AttendanceBadge({ status, size = 'md' }: AttendanceBadgeProps) {
  const tone = getTone(status);
  const palette = badgePalettes[tone];
  const label = getClassificationLabel(status as AttendanceClassification);

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: palette.bg, borderColor: palette.border },
        size === 'sm' && styles.badgeSm,
      ]}
    >
      <Text style={[styles.label, { color: palette.text }, size === 'sm' && styles.labelSm]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
  labelSm: {
    fontSize: 11,
  },
});
