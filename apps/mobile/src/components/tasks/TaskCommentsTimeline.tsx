import { StyleSheet, Text, View } from 'react-native';
import type { TaskCommentRecord } from '../../types/task';
import { formatDateTime, getInitials } from '../../utils/format';
import { colors, radius, spacing, typography } from '../../theme';
import { useAuthStore } from '../../auth/auth-store';

interface TaskCommentsTimelineProps {
  comments: TaskCommentRecord[];
}

export function TaskCommentsTimeline({ comments }: TaskCommentsTimelineProps) {
  const userId = useAuthStore((s) => s.user?.id);

  if (!comments.length) {
    return (
      <Text style={[typography.bodyMd, styles.empty]}>No comments yet. Add an update below.</Text>
    );
  }

  return (
    <View style={styles.list}>
      {comments.map((comment) => {
        const isSelf = comment.user_id === userId;
        const label = comment.user_name ?? (isSelf ? 'You' : 'Team member');
        return (
          <View key={comment.id} style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.initials}>{getInitials(label)}</Text>
            </View>
            <View style={styles.copy}>
              <View style={styles.meta}>
                <Text style={[typography.labelSm, styles.author]}>{label}</Text>
                <Text style={[typography.caption, styles.time]}>{formatDateTime(comment.created_at)}</Text>
              </View>
              <Text style={[typography.bodyMd, styles.content]}>{comment.content}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  copy: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.md,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  author: {
    color: colors.text,
    textTransform: 'none',
    fontFamily: 'Inter_600SemiBold',
  },
  time: {
    color: colors.muted,
  },
  content: {
    color: colors.text,
  },
  empty: {
    color: colors.textSecondary,
  },
});
