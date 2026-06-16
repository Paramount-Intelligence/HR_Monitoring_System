import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AttendanceSession, WorkMode } from '../../types/attendance';
import {
  getWorkSessionState,
  getWorkedMinutes,
  isActiveSession,
  isZeroDurationSession,
} from '../../utils/attendance';
import {
  formatShiftWindow,
  getLateEarlyBadges,
  getSessionStatusDisplay,
  getWorkModeLabel,
} from '../../utils/attendance-formatters';
import { WorkModeSelector } from './WorkModeSelector';
import { useSessionTimer } from '../../hooks/useSessionTimer';
import { formatDuration, formatTime } from '../../utils/format';
import { StatusBadge } from '../ui/StatusBadge';
import { AppButton } from '../ui/AppButton';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';
import { colors, radius, shadows, spacing, typography } from '../../theme';

interface ActiveSessionCardProps {
  session: AttendanceSession | null;
  shiftTiming?: string | null;
  loading?: boolean;
  canCheckIn: boolean;
  canCheckOut: boolean;
  isSessionClosed: boolean;
  actionLoading?: boolean;
  offlineBlocked?: boolean;
  actionMessage?: string | null;
  workMode?: WorkMode;
  onWorkModeChange?: (mode: WorkMode) => void;
  onCheckIn: () => void;
  onCheckOut: () => void;
}

export function ActiveSessionCard({
  session,
  shiftTiming,
  loading = false,
  canCheckIn,
  canCheckOut,
  isSessionClosed,
  actionLoading = false,
  offlineBlocked = false,
  actionMessage,
  workMode = 'office',
  onWorkModeChange,
  onCheckIn,
  onCheckOut,
}: ActiveSessionCardProps) {
  const isActive = isActiveSession(session);
  const workState = getWorkSessionState(session);
  const statusDisplay = getSessionStatusDisplay(session);
  const timer = useSessionTimer(session?.check_in_at, isActive);
  const workedMinutes = getWorkedMinutes(session);
  const zeroDuration = isZeroDurationSession(session);
  const lateEarlyBadges = session ? getLateEarlyBadges(session) : [];
  const shiftLabel = formatShiftWindow(session, shiftTiming);
  const accentColor = isActive ? colors.info : isSessionClosed ? colors.success : colors.primary;

  if (loading && !session) {
    return (
      <View style={styles.card}>
        <View style={[styles.accent, { backgroundColor: colors.info }]} />
        <View style={styles.inner}>
          <LoadingSkeleton height={24} width="50%" />
          <LoadingSkeleton height={40} style={styles.skeletonGap} />
          <LoadingSkeleton height={48} style={styles.skeletonGap} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={[styles.accent, { backgroundColor: accentColor }]} />
      <View style={styles.inner}>
        <View style={styles.topRow}>
          <View style={styles.timerBlock}>
            <Text style={[typography.caption, styles.caption]}>Session timer</Text>
            <Text style={[typography.headlineLg, styles.timer]}>
              {isActive ? timer : formatDuration(workedMinutes)}
            </Text>
          </View>
          <View style={styles.badges}>
            <StatusBadge label={statusDisplay.label} variant={statusDisplay.variant} />
            {lateEarlyBadges.map((badge) => (
              <StatusBadge key={badge.label} label={badge.label} variant={badge.variant} />
            ))}
          </View>
        </View>

        <View style={styles.timeGrid}>
          <View style={styles.timeCell}>
            <Text style={[typography.caption, styles.caption]}>Check in</Text>
            <Text style={[typography.bodyMd, styles.timeValue]}>{formatTime(session?.check_in_at)}</Text>
          </View>
          <View style={styles.timeCell}>
            <Text style={[typography.caption, styles.caption]}>Check out</Text>
            <Text style={[typography.bodyMd, styles.timeValueMuted]}>
              {formatTime(session?.check_out_at)}
            </Text>
          </View>
        </View>

        <View style={styles.shiftRow}>
          <Ionicons name="time-outline" size={16} color={colors.success} />
          <Text style={[typography.labelSm, styles.shiftText]}>Shift: {shiftLabel}</Text>
        </View>

        {session?.work_mode && (isActive || isSessionClosed) ? (
          <View style={styles.modeRow}>
            <StatusBadge
              label={getWorkModeLabel(session.work_mode)}
              variant={session.work_mode === 'wfh' ? 'info' : 'neutral'}
            />
          </View>
        ) : null}

        {actionMessage ? (
          <View style={styles.messageBox}>
            <Text style={[typography.bodyMd, styles.messageText]}>{actionMessage}</Text>
          </View>
        ) : null}

        {offlineBlocked ? (
          <Text style={[typography.caption, styles.offlineHint]}>
            Attendance actions require internet connection.
          </Text>
        ) : null}

        {session?.active_break ? (
          <Text style={[typography.caption, styles.breakHint]}>
            End your active break before checking out.
          </Text>
        ) : null}

        {isSessionClosed ? (
          <View style={styles.closedBox}>
            <Text style={[typography.titleMd, styles.closedTitle]}>Session closed</Text>
            <Text style={[typography.bodyMd, styles.closedHint]}>
              {zeroDuration
                ? 'Your session was closed, but worked duration is 0m.'
                : 'Your work session for today is complete.'}
            </Text>
          </View>
        ) : (
          <View style={styles.actionArea}>
            {canCheckIn && onWorkModeChange ? (
              <WorkModeSelector
                value={workMode}
                onChange={onWorkModeChange}
                disabled={actionLoading || offlineBlocked}
              />
            ) : null}
            {canCheckIn ? (
              <AppButton title="Check In" loading={actionLoading} onPress={onCheckIn} />
            ) : null}
            {canCheckOut ? (
              <AppButton
                title="Check Out"
                loading={actionLoading}
                onPress={onCheckOut}
                style={canCheckIn ? styles.actionSpaced : undefined}
              />
            ) : null}
            {!canCheckIn && !canCheckOut && workState === 'not_checked_in' && !offlineBlocked ? (
              <Text style={[typography.bodyMd, styles.waitHint]}>Ready to start your shift.</Text>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    ...shadows.card,
  },
  accent: {
    width: 4,
  },
  inner: {
    flex: 1,
    padding: spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  timerBlock: {
    flex: 1,
    minWidth: 0,
  },
  caption: {
    color: colors.textSecondary,
  },
  timer: {
    color: colors.primary,
    fontFamily: 'Inter_700Bold',
    marginTop: spacing.xs,
    fontVariant: ['tabular-nums'],
  },
  badges: {
    alignItems: 'flex-end',
    gap: spacing.xs,
    flexShrink: 0,
  },
  timeGrid: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
    marginBottom: spacing.md,
  },
  timeCell: {
    flex: 1,
  },
  timeValue: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 2,
  },
  timeValueMuted: {
    color: colors.textSecondary,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 2,
  },
  shiftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: `${colors.success}26`,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: `${colors.success}33`,
    marginBottom: spacing.md,
  },
  shiftText: {
    color: colors.success,
    textTransform: 'none',
  },
  modeRow: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  messageBox: {
    backgroundColor: `${colors.success}15`,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  messageText: {
    color: colors.success,
    fontFamily: 'Inter_600SemiBold',
  },
  offlineHint: {
    color: colors.warning,
    marginBottom: spacing.sm,
  },
  breakHint: {
    color: colors.warning,
    marginBottom: spacing.sm,
  },
  actionArea: {
    backgroundColor: colors.overlay,
    marginHorizontal: -spacing.lg,
    marginBottom: -spacing.lg,
    marginTop: spacing.xs,
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
  },
  actionSpaced: {
    marginTop: spacing.sm,
  },
  closedBox: {
    backgroundColor: colors.overlay,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  closedTitle: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
  },
  closedHint: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  waitHint: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  skeletonGap: {
    marginTop: spacing.md,
  },
});
