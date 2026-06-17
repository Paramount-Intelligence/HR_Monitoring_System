import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../src/components/ui/Screen';
import { BrandHeader } from '../src/components/brand/BrandHeader';
import { FilterChips } from '../src/components/ui/FilterChips';
import { OfflineBanner } from '../src/components/ui/OfflineBanner';
import { ErrorState } from '../src/components/ui/ErrorState';
import { EmptyState } from '../src/components/ui/EmptyState';
import { LoadingSkeletonList } from '../src/components/ui/LoadingSkeleton';
import { IntelligenceCard } from '../src/components/ui/IntelligenceCard';
import { MetricBentoGrid, MetricBentoItem } from '../src/components/ui/MetricBentoGrid';
import { TaskCard } from '../src/components/tasks/TaskCard';
import { useTeamTasksList } from '../src/hooks/useTasks';
import { useAuthStore } from '../src/auth/auth-store';
import { useNetworkStore } from '../src/network/network-store';
import {
  canUserCreateTask,
  canViewTeamTasks,
  matchesTaskFilter,
  type TaskFilterId,
} from '../src/utils/task-adapters';
import type { TaskViewModel } from '../src/types/task';
import { colors, spacing, typography } from '../src/theme';

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'today', label: 'Due today' },
  { id: 'high_priority', label: 'High priority' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'completed', label: 'Completed' },
];

function groupByAssignee(tasks: TaskViewModel[]): Map<string, TaskViewModel[]> {
  const map = new Map<string, TaskViewModel[]>();
  for (const task of tasks) {
    const key = task.assigneeName;
    const bucket = map.get(key) ?? [];
    bucket.push(task);
    map.set(key, bucket);
  }
  return map;
}

function completedThisWeek(task: TaskViewModel): boolean {
  if (!task.completedAt) return false;
  const completed = new Date(task.completedAt);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return completed >= weekAgo;
}

export default function TeamTasksScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isOffline = useNetworkStore((s) => s.isOffline);
  const [filter, setFilter] = useState<TaskFilterId>('all');
  const [memberFilter, setMemberFilter] = useState('all');

  const tasksQuery = useTeamTasksList();
  const canCreate = canUserCreateTask(user);
  const allowed = canViewTeamTasks(user);

  const allTasks = tasksQuery.data ?? [];

  const members = useMemo(() => {
    const names = [...new Set(allTasks.map((t) => t.assigneeName))].sort();
    return [{ id: 'all', label: 'All members' }, ...names.map((name) => ({ id: name, label: name }))];
  }, [allTasks]);

  const filteredTasks = useMemo(() => {
    return allTasks.filter((task) => {
      if (memberFilter !== 'all' && task.assigneeName !== memberFilter) return false;
      return matchesTaskFilter(task, filter);
    });
  }, [allTasks, filter, memberFilter]);

  const grouped = useMemo(() => groupByAssignee(filteredTasks), [filteredTasks]);

  const metrics = useMemo(() => {
    const overdue = allTasks.filter((t) => t.isOverdue).length;
    const dueToday = allTasks.filter((t) => matchesTaskFilter(t, 'today')).length;
    const highPriority = allTasks.filter((t) => matchesTaskFilter(t, 'high_priority')).length;
    const completedWeek = allTasks.filter(completedThisWeek).length;
    return { overdue, dueToday, highPriority, completedWeek, total: allTasks.length };
  }, [allTasks]);

  const onRefresh = async () => {
    if (isOffline) {
      Alert.alert('Offline', 'No internet connection.');
      return;
    }
    await tasksQuery.refetch();
  };

  if (!allowed) {
    return (
      <Screen headerSafeArea withTabBarInset={false}>
        <BrandHeader title="Team Tasks" onBack={() => router.back()} />
        <ErrorState
          title="Access restricted"
          message="Team task overview is available to managers, team leads, HR, and admins."
        />
      </Screen>
    );
  }

  if (tasksQuery.isError && !allTasks.length) {
    return (
      <Screen headerSafeArea withTabBarInset={false}>
        <BrandHeader title="Team Tasks" onBack={() => router.back()} />
        <ErrorState
          title="Team tasks unavailable"
          message="Unable to load team tasks."
          onRetry={() => void tasksQuery.refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen headerSafeArea scroll={false} withTabBarInset={false}>
      <OfflineBanner />
      <BrandHeader title="Team Tasks" subtitle="Workload overview" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={tasksQuery.isRefetching}
            onRefresh={() => void onRefresh()}
            tintColor={colors.primary}
          />
        }
      >
        <MetricBentoGrid>
          {[
            { label: 'Total', value: metrics.total },
            { label: 'Overdue', value: metrics.overdue, danger: metrics.overdue > 0 },
            { label: 'Due today', value: metrics.dueToday },
            { label: 'High priority', value: metrics.highPriority },
            { label: 'Done this week', value: metrics.completedWeek },
          ].map((item) => (
            <MetricBentoItem key={item.label}>
              <View style={styles.metricCell}>
                <Text style={[typography.caption, styles.metricLabel]}>{item.label}</Text>
                <Text style={[typography.headlineMd, styles.metricValue, item.danger && styles.metricDanger]}>
                  {item.value}
                </Text>
              </View>
            </MetricBentoItem>
          ))}
        </MetricBentoGrid>

        <View style={styles.sectionHeader}>
          <Text style={[typography.headlineMd, styles.sectionTitle]}>Team workload</Text>
          {canCreate ? (
            <Pressable
              onPress={() => router.push('/tasks/create' as never)}
              accessibilityRole="button"
              style={styles.addBtn}
            >
              <Ionicons name="add-circle-outline" size={28} color={colors.primary} />
            </Pressable>
          ) : null}
        </View>

        <FilterChips options={STATUS_FILTERS} selectedId={filter} onSelect={(id) => setFilter(id as TaskFilterId)} />
        <FilterChips options={members} selectedId={memberFilter} onSelect={setMemberFilter} />

        {tasksQuery.isLoading && !allTasks.length ? (
          <LoadingSkeletonList count={4} />
        ) : filteredTasks.length === 0 ? (
          <EmptyState
            title="No team tasks"
            description="Adjust filters or assign new tasks to your team."
            icon="people-outline"
            actionLabel={canCreate ? 'Assign task' : undefined}
            onAction={canCreate ? () => router.push('/tasks/create' as never) : undefined}
          />
        ) : (
          [...grouped.entries()].map(([assignee, tasks]) => (
            <View key={assignee} style={styles.group}>
              <IntelligenceCard
                title={assignee}
                subtitle={`${tasks.length} task${tasks.length === 1 ? '' : 's'}`}
                accentColor={colors.primary}
              />
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  showAssignee={false}
                  onPress={() => router.push(`/tasks/${task.id}` as never)}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
  },
  addBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  group: {
    marginTop: spacing.lg,
  },
  metricCell: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.md,
    minHeight: 72,
    justifyContent: 'center',
  },
  metricLabel: {
    color: colors.textSecondary,
    marginBottom: 2,
  },
  metricValue: {
    color: colors.text,
    fontFamily: 'Inter_700Bold',
  },
  metricDanger: {
    color: colors.danger,
  },
});
