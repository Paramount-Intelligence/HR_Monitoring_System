import { StyleSheet, Text, View } from 'react-native';
import type { AttendanceSession } from '../../types/attendance';
import { getWorkedMinutes } from '../../utils/attendance';
import { formatDate, formatDuration, formatTime, safeText } from '../../utils/format';
import { AttendanceBadge } from './AttendanceBadge';
import { colors, radii, spacing } from '../../constants/theme';

interface AttendanceHistoryListProps {
  sessions: AttendanceSession[];
  loading?: boolean;
}

export function AttendanceHistoryList({ sessions, loading = false }: AttendanceHistoryListProps) {
  if (loading) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>History</Text>
        <Text style={styles.loadingText}>Loading history…</Text>
      </View>
    );
  }

  if (!sessions.length) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>History</Text>
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No attendance records yet.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>History</Text>
      {sessions.map((session) => (
        <HistoryCard key={session.id} session={session} />
      ))}
    </View>
  );
}

function HistoryCard({ session }: { session: AttendanceSession }) {
  const workedMinutes = getWorkedMinutes(session);
  const reason =
    session.checkout_after_shift_reason === 'overtime'
      ? 'Overtime Work'
      : session.checkout_after_shift_reason === 'forgot_checkout'
        ? 'Forgot to check out'
        : session.checkout_after_shift_reason === 'auto_checkout'
          ? 'Auto closed'
          : session.checkout_after_shift_reason
            ? safeText(session.checkout_after_shift_reason)
            : null;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.date}>{formatDate(session.check_in_at)}</Text>
        <AttendanceBadge status={session.attendance_classification} size="sm" />
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
        <Text style={styles.value}>{formatDuration(workedMinutes)}</Text>
      </View>

      {reason ? (
        <View style={styles.noteBox}>
          <Text style={styles.noteLabel}>Reason</Text>
          <Text style={styles.noteText}>{reason}</Text>
        </View>
      ) : null}

      {session.checkout_after_shift_note ? (
        <View style={styles.noteBox}>
          <Text style={styles.noteLabel}>Notes</Text>
          <Text style={styles.noteText}>{session.checkout_after_shift_note}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  loadingText: {
    color: colors.mutedText,
    fontSize: 14,
  },
  emptyBox: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.mutedText,
    fontSize: 14,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  date: {
    fontSize: 15,
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
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  noteBox: {
    marginTop: spacing.sm,
    backgroundColor: colors.overlay,
    borderRadius: radii.sm,
    padding: spacing.sm,
  },
  noteLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.mutedText,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  noteText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
});
