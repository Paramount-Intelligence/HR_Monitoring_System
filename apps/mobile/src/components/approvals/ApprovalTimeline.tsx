import { StyleSheet, Text, View } from 'react-native';
import { AppBadge, type AppBadgeVariant } from '../ui/AppBadge';
import type { ApprovalTimelineEntry } from '../../types/approvals';
import { formatDateTime } from '../../utils/format';
import { colors, radii, spacing } from '../../constants/theme';

function actionVariant(action: string): AppBadgeVariant {
  const normalized = action.toLowerCase();
  if (normalized.includes('approved')) return 'success';
  if (normalized.includes('reject')) return 'danger';
  if (normalized.includes('escalated')) return 'warning';
  if (normalized.includes('clarified')) return 'info';
  return 'neutral';
}

function formatAction(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

interface ApprovalTimelineProps {
  entries: ApprovalTimelineEntry[];
}

export function ApprovalTimeline({ entries }: ApprovalTimelineProps) {
  if (entries.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Timeline</Text>
        <Text style={styles.empty}>No timeline entries yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Timeline</Text>
      {entries.map((entry, index) => (
        <View key={entry.id} style={styles.row}>
          <View style={styles.lineWrap}>
            <View style={styles.dot} />
            {index < entries.length - 1 ? <View style={styles.line} /> : null}
          </View>
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.action}>{formatAction(entry.action)}</Text>
              <AppBadge label={formatAction(entry.action)} variant={actionVariant(entry.action)} />
            </View>
            <Text style={styles.meta}>
              {entry.actor_name ?? 'Approver'} · {formatDateTime(entry.created_at)}
            </Text>
            {entry.comment ? <Text style={styles.comment}>{entry.comment}</Text> : null}
          </View>
        </View>
      ))}
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
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  empty: {
    fontSize: 14,
    color: colors.mutedText,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  lineWrap: {
    alignItems: 'center',
    width: 16,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  action: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    marginTop: 4,
    fontSize: 12,
    color: colors.mutedText,
  },
  comment: {
    marginTop: 6,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
});
