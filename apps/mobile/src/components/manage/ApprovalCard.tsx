import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppBadge } from '../ui/AppBadge';
import { colors, radii, spacing } from '../../constants/theme';
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
      <View style={styles.header}>
        <Text style={styles.title}>{item.title}</Text>
        <AppBadge label={item.status.replace(/_/g, ' ')} variant={statusVariant(item.status)} />
      </View>
      <Text style={styles.requester}>{item.requesterName}</Text>
      <Text style={styles.subtitle}>{item.subtitle}</Text>
      <Text style={styles.time}>{new Date(item.submittedAt).toLocaleString()}</Text>
    </Pressable>
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
  pressed: {
    opacity: 0.92,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  requester: {
    marginTop: spacing.sm,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: colors.mutedText,
    lineHeight: 18,
  },
  time: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.mutedText,
  },
});
