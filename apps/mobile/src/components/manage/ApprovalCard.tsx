import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBadge } from '../ui/StatusBadge';
import { colors, radius, shadows, spacing, typography } from '../../theme';
import { formatDateTime, getInitials } from '../../utils/format';
import type { UnifiedApprovalItem } from '../../types/approvals';

interface ApprovalCardProps {
  item: UnifiedApprovalItem;
  onPress?: () => void;
}

function statusVariant(status: string): 'warning' | 'success' | 'danger' | 'neutral' {
  const normalized = status.toLowerCase();
  if (normalized.includes('pending') || normalized.includes('clarification')) return 'warning';
  if (normalized.includes('approved')) return 'success';
  if (normalized.includes('reject')) return 'danger';
  return 'neutral';
}

export function ApprovalCard({ item, onPress }: ApprovalCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.accent, { backgroundColor: colors.warning }]} />
      <View style={styles.inner}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(item.requesterName)}</Text>
          </View>
          <View style={styles.headerCopy}>
            <Text style={[typography.titleMd, styles.title]} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={[typography.bodySm, styles.requester]}>{item.requesterName}</Text>
          </View>
          <StatusBadge label={item.status.replace(/_/g, ' ')} variant={statusVariant(item.status)} />
        </View>
        <Text style={[typography.bodySm, styles.subtitle]} numberOfLines={3}>
          {item.subtitle}
        </Text>
        <Text style={[typography.caption, styles.time]}>
          {formatDateTime(item.submittedAt)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  pressed: {
    opacity: 0.92,
  },
  accent: {
    width: 4,
  },
  inner: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
  },
  requester: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  subtitle: {
    color: colors.textSecondary,
    lineHeight: 18,
  },
  time: {
    color: colors.muted,
  },
});
