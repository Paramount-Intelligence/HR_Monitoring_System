import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ProjectTaskRecord } from '../../types/project';

import { formatDate } from '../../utils/format';

import { getTaskStatusLabel, getTaskStatusVariant } from '../../utils/task-adapters';

import { StatusBadge } from '../ui/StatusBadge';

import { colors, radius, spacing, typography } from '../../theme';



interface ProjectActivityListProps {

  tasks: ProjectTaskRecord[];

  limit?: number;

  onTaskPress?: (taskId: string) => void;

}



export function ProjectActivityList({ tasks, limit = 5, onTaskPress }: ProjectActivityListProps) {

  const preview = tasks.slice(0, limit);



  if (!preview.length) {

    return (

      <Text style={[typography.bodyMd, styles.empty]}>

        No tasks linked to this project yet.

      </Text>

    );

  }



  return (

    <View style={styles.list}>

      {preview.map((task) => (

        <Pressable

          key={task.id}

          onPress={onTaskPress ? () => onTaskPress(task.id) : undefined}

          disabled={!onTaskPress}

          accessibilityRole={onTaskPress ? 'button' : undefined}

          style={({ pressed }) => [styles.row, onTaskPress && pressed && styles.pressed]}

        >

          <View style={styles.copy}>

            <Text style={[typography.bodyMd, styles.title]} numberOfLines={1}>

              {task.title}

            </Text>

            <Text style={[typography.caption, styles.meta]}>

              {task.assigned_to_name ?? 'Unassigned'}

              {task.due_date ? ` · Due ${formatDate(task.due_date)}` : ''}

            </Text>

          </View>

          <StatusBadge

            label={getTaskStatusLabel(task.status)}

            variant={getTaskStatusVariant(task.status)}

          />

        </Pressable>

      ))}

      {tasks.length > limit ? (

        <Text style={[typography.caption, styles.more]}>

          +{tasks.length - limit} more tasks

        </Text>

      ) : null}

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

  pressed: {

    opacity: 0.92,

  },

  copy: {

    flex: 1,

    minWidth: 0,

  },

  title: {

    color: colors.text,

    fontFamily: 'Inter_600SemiBold',

  },

  meta: {

    color: colors.textSecondary,

    marginTop: 2,

  },

  empty: {

    color: colors.textSecondary,

  },

  more: {

    color: colors.muted,

    marginTop: spacing.xs,

  },

});

