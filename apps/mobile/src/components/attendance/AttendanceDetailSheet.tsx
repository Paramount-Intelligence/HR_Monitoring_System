import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { AttendanceSession } from '../../types/attendance';
import {
  canRequestCorrection,
  formatShiftWindow,
  getCorrectionStatusLabel,
  getLateEarlyBadges,
  getSessionStatusDisplay,
  getWorkModeLabel,
} from '../../utils/attendance-formatters';
import { getWorkedMinutes } from '../../utils/attendance';
import { formatDate, formatDuration, formatTime } from '../../utils/format';
import { BottomSheet } from '../ui/BottomSheet';
import { StatusBadge } from '../ui/StatusBadge';
import { AppButton } from '../ui/AppButton';
import { colors, spacing, typography } from '../../theme';

interface AttendanceDetailSheetProps {
  session: AttendanceSession | null;
  visible: boolean;
  shiftTiming?: string | null;
  onClose: () => void;
}

export function AttendanceDetailSheet({
  session,
  visible,
  shiftTiming,
  onClose,
}: AttendanceDetailSheetProps) {
  const router = useRouter();

  if (!session) return null;

  const status = getSessionStatusDisplay(session);
  const correctionStatus = getCorrectionStatusLabel(session);
  const lateEarly = getLateEarlyBadges(session);
  const workedMinutes = getWorkedMinutes(session);

  const openCorrection = () => {
    onClose();
    router.push({
      pathname: '/attendance/correction',
      params: { sessionId: session.id },
    });
  };

  const timeline = [
    {
      label: 'Checked in',
      value: formatTime(session.check_in_at),
      active: true,
    },
    {
      label: 'Checked out',
      value: formatTime(session.check_out_at),
      active: Boolean(session.check_out_at),
    },
    ...(session.correction_requested || session.is_corrected
      ? [
          {
            label: session.is_corrected ? 'Correction approved' : 'Correction requested',
            value: session.correction_reason ? session.correction_reason.slice(0, 80) : '—',
            active: true,
          },
        ]
      : []),
  ];

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={[typography.headlineMd, styles.title]}>{formatDate(session.check_in_at)}</Text>
        <View style={styles.badgeRow}>
          <StatusBadge label={status.label} variant={status.variant} />
          {correctionStatus ? (
            <StatusBadge
              label={correctionStatus}
              variant={correctionStatus === 'Approved' ? 'success' : 'warning'}
            />
          ) : null}
          {lateEarly.map((badge) => (
            <StatusBadge key={badge.label} label={badge.label} variant={badge.variant} />
          ))}
        </View>

        <View style={styles.metrics}>
          <Metric label="Shift" value={formatShiftWindow(session, shiftTiming)} />
          <Metric label="Check in" value={formatTime(session.check_in_at)} />
          <Metric label="Check out" value={formatTime(session.check_out_at)} />
          <Metric label="Duration" value={formatDuration(workedMinutes)} />
          <Metric label="Work mode" value={getWorkModeLabel(session.work_mode)} />
        </View>

        <Text style={[typography.titleMd, styles.sectionTitle]}>Activity</Text>
        <View style={styles.timeline}>
          {timeline.map((item, index) => (
            <View key={item.label} style={styles.timelineRow}>
              <View style={styles.timelineRail}>
                <View style={[styles.dot, item.active && styles.dotActive]} />
                {index < timeline.length - 1 ? <View style={styles.line} /> : null}
              </View>
              <View style={styles.timelineCopy}>
                <Text style={[typography.bodyMd, styles.timelineLabel]}>{item.label}</Text>
                <Text style={[typography.caption, styles.timelineValue]}>{item.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {canRequestCorrection(session) ? (
          <AppButton title="Request Correction" onPress={openCorrection} style={styles.cta} />
        ) : session.correction_requested ? (
          <Text style={[typography.caption, styles.pendingNote]}>
            A correction request is already pending review.
          </Text>
        ) : null}
      </ScrollView>
    </BottomSheet>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={[typography.caption, styles.metricLabel]}>{label}</Text>
      <Text style={[typography.bodyMd, styles.metricValue]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.lg,
  },
  title: {
    color: colors.text,
    fontFamily: 'Inter_700Bold',
    marginBottom: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  metrics: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  metric: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  metricLabel: {
    color: colors.textSecondary,
  },
  metricValue: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
    flexShrink: 1,
    textAlign: 'right',
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: spacing.md,
  },
  timeline: {
    marginBottom: spacing.lg,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 48,
  },
  timelineRail: {
    width: 16,
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
    marginTop: 4,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  timelineCopy: {
    flex: 1,
    paddingBottom: spacing.sm,
  },
  timelineLabel: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
  },
  timelineValue: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  cta: {
    marginTop: spacing.sm,
  },
  pendingNote: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
