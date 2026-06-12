import { StyleSheet, Text, View } from 'react-native';
import { AppBadge } from '../ui/AppBadge';
import { colors, radii, spacing } from '../../constants/theme';
import { formatDuration, formatTime, safeText } from '../../utils/format';
import { getClassificationLabel } from '../../utils/attendance';
import type { AttendanceSession } from '../../types/attendance';

interface AttendanceOverviewCardProps {
  session: AttendanceSession;
}

function classificationVariant(
  classification: AttendanceSession['attendance_classification']
): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  switch (classification) {
    case 'full_day':
      return 'success';
    case 'half_day':
    case 'short_leave':
    case 'insufficient':
      return 'warning';
    case 'full_leave':
    case 'leave':
      return 'danger';
    case 'active':
      return 'info';
    default:
      return 'neutral';
  }
}

function statusBadge(session: AttendanceSession): { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' } {
  if (session.session_status === 'active') return { label: 'Present', variant: 'success' };
  if (session.attendance_classification) {
    return {
      label: getClassificationLabel(session.attendance_classification),
      variant: classificationVariant(session.attendance_classification),
    };
  }
  if (session.is_late_login) return { label: 'Late', variant: 'danger' };
  if (session.check_out_at) return { label: 'Session Closed', variant: 'info' };
  return { label: 'Unknown', variant: 'neutral' };
}

export function AttendanceOverviewCard({ session }: AttendanceOverviewCardProps) {
  const badge = statusBadge(session);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{safeText(session.user_full_name, 'Team member')}</Text>
        <AppBadge label={badge.label} variant={badge.variant} />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Check In</Text>
        <Text style={styles.value}>{formatTime(session.check_in_at)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Check Out</Text>
        <Text style={styles.value}>{formatTime(session.check_out_at)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Duration</Text>
        <Text style={styles.value}>
          {formatDuration(session.worked_minutes ?? session.duration_minutes ?? null)}
        </Text>
      </View>
      <View style={styles.footer}>
        <AppBadge label={session.work_mode.toUpperCase()} variant="info" />
        {session.is_late_login ? <AppBadge label="Late login" variant="danger" /> : null}
        {session.is_early_logout ? <AppBadge label="Early out" variant="warning" /> : null}
        {session.correction_requested ? <AppBadge label="Correction pending" variant="warning" /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  label: {
    fontSize: 13,
    color: colors.mutedText,
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
