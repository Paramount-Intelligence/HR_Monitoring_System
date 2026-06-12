import { StyleSheet, Text, View } from 'react-native';
import type { AttendanceSession } from '../../types/attendance';
import {
  getAttendanceResultLabel,
  getClassificationLabel,
  getWorkSessionLabel,
  getWorkSessionState,
  getWorkedMinutes,
  hasSameCheckInOutTime,
  isZeroDurationSession,
} from '../../utils/attendance';
import { formatDuration, formatTime, safeText } from '../../utils/format';
import { AttendanceBadge } from './AttendanceBadge';
import { colors, radii, spacing } from '../../constants/theme';

interface AttendanceStatusCardProps {
  session: AttendanceSession | null;
  shiftTiming?: string | null;
  loading?: boolean;
}

export function AttendanceStatusCard({
  session,
  shiftTiming,
  loading = false,
}: AttendanceStatusCardProps) {
  const workState = getWorkSessionState(session);
  const sessionLabel = getWorkSessionLabel(workState);
  const resultLabel = getAttendanceResultLabel(session);
  const workedMinutes = getWorkedMinutes(session);
  const zeroDuration = isZeroDurationSession(session);
  const sameTimes = hasSameCheckInOutTime(session);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Today</Text>
        {session?.attendance_classification && workState === 'session_closed' ? (
          <AttendanceBadge status={session.attendance_classification} />
        ) : workState === 'checked_in' ? (
          <AttendanceBadge status="active" />
        ) : null}
      </View>

      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Work Session</Text>
        <Text style={styles.statusValue}>{loading ? '…' : sessionLabel}</Text>
      </View>

      {resultLabel && workState === 'session_closed' ? (
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Result</Text>
          <Text style={styles.resultValue}>{loading ? '…' : resultLabel}</Text>
        </View>
      ) : null}

      <View style={styles.grid}>
        <InfoItem label="Check In" value={loading ? '…' : formatTime(session?.check_in_at)} />
        <InfoItem label="Check Out" value={loading ? '…' : formatTime(session?.check_out_at)} />
        <InfoItem label="Duration" value={loading ? '…' : formatDuration(workedMinutes)} />
        <InfoItem label="Shift" value={loading ? '…' : safeText(shiftTiming, '—')} />
        <InfoItem
          label="Work Mode"
          value={loading ? '…' : safeText(session?.work_mode?.toUpperCase(), '—')}
        />
      </View>

      {!loading && zeroDuration && workState === 'session_closed' ? (
        <Text style={styles.note}>
          Your session was closed, but worked duration is 0m.
          {sameTimes ? ' Check-in and check-out were recorded at the same time.' : ''}
        </Text>
      ) : null}

      {!loading && session?.is_late_login ? (
        <Text style={styles.flag}>Late check-in</Text>
      ) : null}
      {!loading && session?.is_early_logout ? (
        <Text style={styles.flag}>Early check-out</Text>
      ) : null}
      {!loading && session?.is_overtime ? (
        <Text style={[styles.flag, styles.overtime]}>Overtime</Text>
      ) : null}
    </View>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusLabel: {
    fontSize: 14,
    color: colors.mutedText,
  },
  statusValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  resultValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  infoItem: {
    width: '46%',
  },
  infoLabel: {
    fontSize: 12,
    color: colors.mutedText,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },
  note: {
    marginTop: spacing.md,
    fontSize: 13,
    color: colors.mutedText,
    lineHeight: 18,
  },
  flag: {
    marginTop: spacing.md,
    fontSize: 13,
    fontWeight: '600',
    color: colors.warning,
  },
  overtime: {
    color: colors.info,
  },
});
