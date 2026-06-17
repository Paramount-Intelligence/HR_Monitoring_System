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
import { ProjectCard } from '../../src/components/projects/ProjectCard';
import { useProjects } from '../../src/hooks/useProjects';
import { getUnreadNotificationCount } from '../../src/api/notifications.api';
import { queryKeys } from '../../src/constants/query-keys';
import { useTabScreenBottomInset } from '../../src/hooks/useTabScreenBottomInset';
import { useAuthStore } from '../../src/auth/auth-store';
import { useNetworkStore } from '../../src/network/network-store';
import { OfflineQueueStatus } from '../../src/offline/OfflineQueueStatus';
import { canUserCreateProject } from '../../src/utils/project-adapters';
import type { ProjectViewModel } from '../../src/types/project';
import { colors, spacing, typography } from '../../src/theme';

type ProjectFilter =
  | 'all'
  | 'active'
  | 'planning'
  | 'on_track'
  | 'at_risk'
  | 'delayed'
  | 'completed'
  | 'mine'
  | 'team';

const FILTER_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'planning', label: 'Planning' },
  { id: 'on_track', label: 'On Track' },
  { id: 'at_risk', label: 'At Risk' },
  { id: 'delayed', label: 'Delayed' },
  { id: 'completed', label: 'Completed' },
  { id: 'mine', label: 'My Projects' },
  { id: 'team', label: 'Team Projects' },
];

function matchesFilter(project: ProjectViewModel, filter: ProjectFilter, userId?: string): boolean {
  switch (filter) {
    case 'active':
      return project.status === 'active';
    case 'planning':
      return project.status === 'pending_approval' || project.status === 'draft' || project.status === 'approved';
    case 'on_track':
      return project.health === 'on_track';
    case 'at_risk':
      return project.health === 'at_risk';
    case 'delayed':
      return project.health === 'delayed';
    case 'completed':
      return project.status === 'completed' || project.health === 'completed';
    case 'mine':
      return Boolean(userId && project.ownerId === userId);
    case 'team':
      return Boolean(userId && project.managerId === userId);
    default:
      return true;
  }
}

function matchesSearch(project: ProjectViewModel, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    project.name.toLowerCase().includes(q) ||
    (project.description?.toLowerCase().includes(q) ?? false)
  );
}

export default function ProjectsTabScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isOffline = useNetworkStore((s) => s.isOffline);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ProjectFilter>('all');
  const tabBottomInset = useTabScreenBottomInset();

  const projectsQuery = useProjects();
  const alertsUnreadQuery = useQuery({
    queryKey: queryKeys.notificationsUnread,
    queryFn: getUnreadNotificationCount,
  });

  const enrichedProjects = useMemo(() => {
    return projectsQuery.data ?? [];
  }, [projectsQuery.data]);

  const filteredProjects = useMemo(() => {
    return enrichedProjects.filter(
      (project) => matchesFilter(project, filter, user?.id) && matchesSearch(project, search)
    );
  }, [enrichedProjects, filter, search, user?.id]);

  const canCreate = canUserCreateProject(user);

  const onRefresh = async () => {
    if (isOffline) {
      Alert.alert('Offline', 'No internet connection.');
      return;
    }
    await projectsQuery.refetch();
  };

  if (projectsQuery.isError && !projectsQuery.data?.length) {
    return (
      <Screen scroll={false} withTabBarInset headerSafeArea edges={['left', 'right']} style={styles.screen}>
        <OfflineBanner />
        <BrandHeader
          title="Projects"
          subtitle="Track project execution"
          showNotificationBell
          notificationCount={alertsUnreadQuery.data ?? 0}
          onNotificationPress={() => router.push('/alerts')}
        />
        <ErrorState
          title="Projects unavailable"
          message="Unable to load projects. Please try again."
          onRetry={() => void projectsQuery.refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} withTabBarInset headerSafeArea edges={['left', 'right']} style={styles.screen}>
      <OfflineBanner />
      <BrandHeader
        title="Projects"
        subtitle="Workforce delivery"
        showNotificationBell
        notificationCount={alertsUnreadQuery.data ?? 0}
        onNotificationPress={() => router.push('/alerts')}
      />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBottomInset }]}
        refreshControl={
          <RefreshControl
            refreshing={projectsQuery.isRefetching}
            onRefresh={() => void onRefresh()}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
      >
        <View style={styles.stickyFilters}>
          <OfflineQueueStatus />
          <SearchInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search projects…"
            containerStyle={styles.search}
          />
          <FilterChips
            options={FILTER_OPTIONS}
            selectedId={filter}
            onSelect={(id) => setFilter(id as ProjectFilter)}
          />
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={[typography.headlineMd, styles.sectionTitle]}>Projects overview</Text>
            <Text style={[typography.bodyMd, styles.sectionSubtitle]}>
              {filteredProjects.length} project{filteredProjects.length === 1 ? '' : 's'}
            </Text>
          </View>
          {canCreate ? (
            <Pressable
              onPress={() => router.push('/projects/create')}
              accessibilityRole="button"
              style={styles.addBtn}
            >
              <Ionicons name="add-circle-outline" size={28} color={colors.primary} />
            </Pressable>
          ) : null}
        </View>

        {(projectsQuery.isLoading && (projectsQuery.data ?? []).length === 0) ? (
          <LoadingSkeletonList count={3} />
        ) : filteredProjects.length === 0 ? (
          <EmptyState
            title={search || filter !== 'all' ? 'No matching projects' : 'No projects yet'}
            description={
              canCreate
                ? 'Create a project or adjust your filters.'
                : 'Projects assigned to you will appear here.'
            }
            icon="briefcase-outline"
            actionLabel={canCreate ? 'Create project' : undefined}
            onAction={canCreate ? () => router.push('/projects/create') : undefined}
          />
        ) : (
          filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onPress={() => router.push(`/projects/${project.id}` as never)}
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
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
