import { StyleSheet, Text, View } from 'react-native';
import type { TaskApiRecord } from '../../types/task';
import { TaskStatusBadge } from './TaskStatusBadge';
import { colors, radius, spacing, typography } from '../../theme';

interface TaskChecklistProps {
  subtasks: TaskApiRecord[];
}

export function TaskChecklist({ subtasks }: TaskChecklistProps) {
  if (!subtasks.length) {
    return (
      <Text style={[typography.bodyMd, styles.empty]}>No subtasks for this task.</Text>
    );
  }

  return (
    <View style={styles.list}>
      {subtasks.map((subtask) => (
        <View key={subtask.id} style={styles.row}>
          <Text style={[typography.bodyMd, styles.title]} numberOfLines={1}>
            {subtask.title}
          </Text>
          <TaskStatusBadge status={subtask.status} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.md,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
  },
  empty: {
    color: colors.textSecondary,
  },
});
