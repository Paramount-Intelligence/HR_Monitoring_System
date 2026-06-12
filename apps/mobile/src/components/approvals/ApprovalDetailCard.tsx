import { StyleSheet, Text, View } from 'react-native';
import { AppBadge } from '../ui/AppBadge';
import { ApprovalStatusBadge } from './ApprovalStatusBadge';
import { colors, radii, spacing } from '../../constants/theme';
import { formatLeaveType } from '../../utils/manage';
import { formatTime } from '../../utils/format';
import type { LeaveRequest } from '../../types/approvals';
import type { AttendanceSession } from '../../types/attendance';

interface ApprovalDetailCardProps {
  kind: 'leave' | 'correction';
  leave?: LeaveRequest;
  correction?: AttendanceSession;
}

export function ApprovalDetailCard({ kind, leave, correction }: ApprovalDetailCardProps) {
  if (kind === 'leave' && leave) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>{formatLeaveType(leave.leave_type)}</Text>
          <ApprovalStatusBadge status={leave.status} />
        </View>
        <DetailRow label="Requester" value={leave.user_full_name ?? 'Employee'} />
        <DetailRow label="Dates" value={`${leave.start_date} → ${leave.end_date}`} />
        <DetailRow label="Reason" value={leave.reason} />
        <DetailRow label="Submitted" value={new Date(leave.created_at).toLocaleString()} />
        {leave.manager_comment ? (
          <DetailRow label="Previous comment" value={leave.manager_comment} />
        ) : null}
        {leave.current_approver_id ? (
          <DetailRow label="Current approver" value="Assigned approver" />
        ) : null}
      </View>
    );
  }

  if (kind === 'correction' && correction) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Attendance Correction</Text>
          <AppBadge label="Pending" variant="warning" />
        </View>
        <DetailRow label="Requester" value={correction.user_full_name ?? 'Employee'} />
        <DetailRow label="Current check in" value={formatTime(correction.check_in_at)} />
        <DetailRow label="Current check out" value={formatTime(correction.check_out_at)} />
        <DetailRow label="Reason" value={correction.correction_reason ?? '—'} />
        <DetailRow label="Submitted" value={new Date(correction.updated_at).toLocaleString()} />
      </View>
    );
  }

  return null;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
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
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  row: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.mutedText,
    textTransform: 'uppercase',
  },
  rowValue: {
    marginTop: 4,
    fontSize: 15,
    color: colors.text,
    lineHeight: 21,
  },
});
