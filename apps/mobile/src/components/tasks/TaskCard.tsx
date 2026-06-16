import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '../../animations/AnimatedPressable';
import type { TaskViewModel } from '../../types/task';
import { getTaskAccentColor } from '../../utils/task-adapters';
import { formatDate } from '../../utils/format';
import { TaskStatusBadge } from './TaskStatusBadge';
import { TaskPriorityBadge } from './TaskPriorityBadge';
import { TaskProgressSummary } from './TaskProgressSummary';
import { colors, radius, shadows, spacing, typography } from '../../theme';

interface TaskCardProps {
  task: TaskViewModel;
  onPress: () => void;
  showAssignee?: boolean;
}

export function TaskCard({ task, onPress, showAssignee = false }: TaskCardProps) {
  const accent = getTaskAccentColor(task, task.isOverdue);

  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityRole="button"
      style={styles.wrap}
    >
      <View style={styles.card}>
        <View style={[styles.accent, { backgroundColor: accent }]} />
        <View style={styles.inner}>
          <View style={styles.header}>
            <Text style={[typography.titleMd, styles.title]} numberOfLines={2}>
              {task.title}
            </Text>
            <TaskStatusBadge status={task.status} />
          </View>

          <Text style={[typography.caption, styles.project]} numberOfLines={1}>
            {task.projectName}
          </Text>

          <View style={styles.badges}>
            <TaskPriorityBadge priority={task.priority} />
            {task.isOverdue ? (
              <View style={styles.overduePill}>
                <Text style={[typography.labelSm, styles.overdueText]}>OVERDUE</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.metaRow}>
            {task.dueDate ? (
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                <Text style={[typography.caption, styles.metaText]}>
                  Due {formatDate(task.dueDate)}
                </Text>
              </View>
            ) : null}
            {showAssignee ? (
              <Text style={[typography.caption, styles.metaText]}>{task.assigneeName}</Text>
            ) : null}
          </View>

          <TaskProgressSummary progress={task.progress} status={task.status} compact />

          <View style={styles.footer}>
            {task.commentsCount > 0 ? (
              <View style={styles.footerItem}>
                <Ionicons name="chatbubble-outline" size={14} color={colors.textSecondary} />
                <Text style={[typography.caption, styles.footerText]}>{task.commentsCount}</Text>
              </View>
            ) : null}
            {task.subtasksCount > 0 ? (
              <View style={styles.footerItem}>
                <Ionicons name="list-outline" size={14} color={colors.textSecondary} />
                <Text style={[typography.caption, styles.footerText]}>
                  {task.completedSubtasksCount}/{task.subtasksCount}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  pressed: {
    opacity: 0.92,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    flexDirection: 'row',
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
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
  },
  project: {
    color: colors.textSecondary,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    alignItems: 'center',
  },
  overduePill: {
    backgroundColor: `${colors.danger}26`,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  overdueText: {
    color: colors.danger,
    textTransform: 'none',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.xs,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    color: colors.textSecondary,
  },
});
