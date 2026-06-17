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
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/ui/Screen';
import { BrandHeader } from '../../src/components/brand/BrandHeader';
import { SearchInput } from '../../src/components/ui/SearchInput';
import { FilterChips } from '../../src/components/ui/FilterChips';
import { OfflineBanner } from '../../src/components/ui/OfflineBanner';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { LoadingSkeletonList } from '../../src/components/ui/LoadingSkeleton';
import { TaskCard } from '../../src/components/tasks/TaskCard';
import { useMyTasks, useTeamTasksList } from '../../src/hooks/useTasks';
import { getUnreadNotificationCount } from '../../src/api/notifications.api';
import { queryKeys } from '../../src/constants/query-keys';
import { useTabScreenBottomInset } from '../../src/hooks/useTabScreenBottomInset';
import { useAuthStore } from '../../src/auth/auth-store';
import { useNetworkStore } from '../../src/network/network-store';
import { OfflineQueueStatus } from '../../src/offline/OfflineQueueStatus';
import {
  canUserCreateTask,
  canViewTeamTasks,
  matchesTaskFilter,
  matchesTaskSearch,
  type TaskFilterId,
} from '../../src/utils/task-adapters';
import { colors, spacing, typography } from '../../src/theme';

type TaskScope = 'mine' | 'team';

const SCOPE_OPTIONS = [
  { id: 'mine', label: 'My Tasks' },
  { id: 'team', label: 'Team Tasks' },
];

const FILTER_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'pending', label: 'Pending' },
  { id: 'not_started', label: 'Not Started' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'in_review', label: 'In Review' },
  { id: 'completed', label: 'Completed' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'high_priority', label: 'High Priority' },
];

export default function TasksTabScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isOffline = useNetworkStore((s) => s.isOffline);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<TaskFilterId>('all');
  const [scope, setScope] = useState<TaskScope>('mine');
  const tabBottomInset = useTabScreenBottomInset();

  const showTeamScope = canViewTeamTasks(user);
  const canCreate = canUserCreateTask(user);

  const myTasksQuery = useMyTasks();
  const teamTasksQuery = useTeamTasksList();

  const activeQuery = scope === 'team' && showTeamScope ? teamTasksQuery : myTasksQuery;

  const alertsUnreadQuery = useQuery({
    queryKey: queryKeys.notificationsUnread,
    queryFn: getUnreadNotificationCount,
  });

  const filteredTasks = useMemo(() => {
    const tasks = activeQuery.data ?? [];
    return tasks.filter(
      (task) => matchesTaskFilter(task, filter) && matchesTaskSearch(task, search)
    );
  }, [activeQuery.data, filter, search]);

  const onRefresh = async () => {
    if (isOffline) {
      Alert.alert('Offline', 'No internet connection.');
      return;
    }
    await activeQuery.refetch();
  };

  if (activeQuery.isError && !(activeQuery.data ?? []).length) {
    return (
      <Screen scroll={false} withTabBarInset headerSafeArea edges={['left', 'right']} style={styles.screen}>
        <OfflineBanner />
        <BrandHeader
          title="Tasks"
          subtitle="Track work execution"
          showNotificationBell
          notificationCount={alertsUnreadQuery.data ?? 0}
          onNotificationPress={() => router.push('/alerts')}
        />
        <ErrorState
          title="Tasks unavailable"
          message="Unable to load tasks. Please try again."
          onRetry={() => void activeQuery.refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} withTabBarInset headerSafeArea edges={['left', 'right']} style={styles.screen}>
      <OfflineBanner />
      <BrandHeader
        title="Tasks"
        subtitle="My work queue"
        showNotificationBell
        notificationCount={alertsUnreadQuery.data ?? 0}
        onNotificationPress={() => router.push('/alerts')}
      />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBottomInset }]}
        refreshControl={
          <RefreshControl
            refreshing={activeQuery.isRefetching}
            onRefresh={() => void onRefresh()}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
      >
        <View style={styles.stickyFilters}>
          <OfflineQueueStatus />
          {showTeamScope ? (
            <FilterChips
              options={SCOPE_OPTIONS}
              selectedId={scope}
              onSelect={(id) => setScope(id as TaskScope)}
            />
          ) : null}
          <SearchInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search tasks…"
            containerStyle={styles.search}
          />
          <FilterChips
            options={FILTER_OPTIONS}
            selectedId={filter}
            onSelect={(id) => setFilter(id as TaskFilterId)}
          />
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={[typography.headlineMd, styles.sectionTitle]}>
              {scope === 'team' && showTeamScope ? 'Team tasks' : 'My tasks'}
            </Text>
            <Text style={[typography.bodyMd, styles.sectionSubtitle]}>
              {filteredTasks.length} task{filteredTasks.length === 1 ? '' : 's'}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {showTeamScope ? (
              <Pressable
                onPress={() => router.push('/team-tasks' as never)}
                accessibilityRole="button"
                style={styles.iconBtn}
              >
                <Ionicons name="people-outline" size={24} color={colors.primary} />
              </Pressable>
            ) : null}
            {canCreate ? (
              <Pressable
                onPress={() => router.push('/tasks/create' as never)}
                accessibilityRole="button"
                style={styles.iconBtn}
              >
                <Ionicons name="add-circle-outline" size={28} color={colors.primary} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {activeQuery.isLoading && !(activeQuery.data ?? []).length ? (
          <LoadingSkeletonList count={4} />
        ) : filteredTasks.length === 0 ? (
          <EmptyState
            title={search || filter !== 'all' ? 'No matching tasks' : 'No tasks yet'}
            description={
              canCreate
                ? 'Create a task or adjust your filters.'
                : 'Assigned tasks will appear here.'
            }
            icon="checkbox-outline"
            actionLabel={canCreate ? 'Create task' : undefined}
            onAction={canCreate ? () => router.push('/tasks/create' as never) : undefined}
          />
        ) : (
          filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              showAssignee={scope === 'team' && showTeamScope}
              onPress={() => router.push(`/tasks/${task.id}` as never)}
            />
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    flexGrow: 1,
    width: '100%',
    maxWidth: '100%',
  },
  stickyFilters: {
    backgroundColor: colors.background,
    paddingBottom: spacing.sm,
    width: '100%',
    maxWidth: '100%',
  },
  search: {
    marginBottom: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
    minWidth: 0,
    gap: spacing.sm,
  },
  sectionTitle: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
  },
  sectionSubtitle: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
