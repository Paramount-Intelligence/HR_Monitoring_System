import { useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BrandHeader } from '../../src/components/brand/BrandHeader';
import { Screen } from '../../src/components/ui/Screen';
import { AppButton } from '../../src/components/ui/AppButton';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { LoadingSkeletonList } from '../../src/components/ui/LoadingSkeleton';
import { IntelligenceCard } from '../../src/components/ui/IntelligenceCard';
import { OfflineBanner } from '../../src/components/ui/OfflineBanner';
import {
  ProjectActivityList,
  ProjectHealthBadge,
  ProjectProgressSummary,
  ProjectStatusBadge,
  ProjectTaskSummaryCard,
  ProjectTeamAvatars,
  getHealthAccentColor,
} from '../../src/components/projects';
import { PriorityBadge } from '../../src/components/ui/PriorityBadge';
import { useApproveProject, useProject } from '../../src/hooks/useProjects';
import { getOrCreateDirectConversation } from '../../src/api/conversations.api';
import { getErrorMessage } from '../../src/api/client';
import { formatDate } from '../../src/utils/format';
import { useNetworkStore } from '../../src/network/network-store';
import { colors, radius, spacing, typography } from '../../src/theme';
import { canUserCreateTask } from '../../src/utils/task-adapters';
import { useAuthStore } from '../../src/auth/auth-store';

export default function ProjectDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ projectId: string }>();
  const projectId = params.projectId;
  const isOffline = useNetworkStore((s) => s.isOffline);
  const user = useAuthStore((s) => s.user);
  const canCreateTask = canUserCreateTask(user);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);

  const { project, tasks, isLoading, isError, refetch } = useProject(projectId);
  const approveMutation = useApproveProject();

  const handleApprove = () => {
    if (!project || isOffline) return;
    approveMutation.mutate(
      { projectId: project.id, payload: { decision: 'approved' } },
      {
        onSuccess: () => Alert.alert('Approved', 'Project approved successfully.'),
        onError: (error) =>
          Alert.alert('Approval failed', getErrorMessage(error, 'Unable to approve project.')),
      }
    );
  };

  const handleReject = () => {
    if (!project || isOffline) return;
    if (rejectReason.trim().length < 3) {
      Alert.alert('Reason required', 'Please provide a rejection reason.');
      return;
    }
    approveMutation.mutate(
      { projectId: project.id, payload: { decision: 'rejected', reason: rejectReason.trim() } },
      {
        onSuccess: () => {
          setShowReject(false);
          setRejectReason('');
          Alert.alert('Rejected', 'Project rejected.');
        },
        onError: (error) =>
          Alert.alert('Rejection failed', getErrorMessage(error, 'Unable to reject project.')),
      }
    );
  };

  const messageManager = async () => {
    if (!project?.managerId) return;
    try {
      const conversation = await getOrCreateDirectConversation(project.managerId);
      router.push(`/chat/${conversation.id}` as never);
    } catch (error) {
      Alert.alert('Messages', getErrorMessage(error, 'Unable to open conversation.'));
    }
  };

  if (isLoading && !project) {
    return (
      <Screen withTabBarInset={false}>
        <BrandHeader title="Project" onBack={() => router.back()} />
        <LoadingSkeletonList count={4} />
      </Screen>
    );
  }

  if (isError || !project) {
    return (
      <Screen withTabBarInset={false}>
        <BrandHeader title="Project" onBack={() => router.back()} />
        <ErrorState
          title="Project unavailable"
          message="Unable to load this project or access is restricted."
          onRetry={() => void refetch()}
        />
      </Screen>
    );
  }

  const accent = getHealthAccentColor(project.health);

  return (
    <Screen scroll={false} withTabBarInset={false}>
      <OfflineBanner />
      <BrandHeader title={project.name} onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={() => void refetch()} tintColor={colors.primary} />
        }
      >
        <View style={styles.heroCard}>
          <View style={[styles.accent, { backgroundColor: accent }]} />
          <View style={styles.heroInner}>
            <View style={styles.heroTop}>
              <ProjectHealthBadge health={project.health} />
              <View style={styles.heroBadges}>
                <ProjectStatusBadge status={project.status} />
                <PriorityBadge priority={project.priority} />
              </View>
            </View>
            <Text style={[typography.headlineLg, styles.heroTitle]}>{project.name}</Text>
            {project.description ? (
              <Text style={[typography.bodyMd, styles.description]}>{project.description}</Text>
            ) : null}
            <View style={styles.deadlineRow}>
              <Text style={[typography.labelSm, styles.deadlineLabel]}>DEADLINE</Text>
              <Text style={[typography.bodyMd, styles.deadlineValue]}>
                {project.dueDate ? formatDate(project.dueDate) : '—'}
              </Text>
            </View>
            <ProjectProgressSummary progress={project.progress} health={project.health} />
          </View>
        </View>

        <IntelligenceCard
          title="Project team"
          subtitle={`Owner ${project.ownerName ?? 'Assigned'} · Manager ${project.managerName ?? 'Assigned'}`}
          accentColor={colors.primary}
        >
          <ProjectTeamAvatars
            ownerName={project.ownerName}
            managerName={project.managerName}
            count={project.teamMembersCount}
          />
        </IntelligenceCard>

        <Text style={[typography.headlineMd, styles.sectionTitle]}>Task summary</Text>
        <ProjectTaskSummaryCard summary={project.taskSummary} />

        <Text style={[typography.headlineMd, styles.sectionTitle]}>Tasks preview</Text>
        <ProjectActivityList
          tasks={tasks}
          onTaskPress={(id) => router.push(`/tasks/${id}` as never)}
        />

        <IntelligenceCard
          title="Project alerts"
          subtitle="View workforce alerts related to this project"
          accentColor={colors.warning}
          onPress={() => router.push('/alerts')}
        />

        <View style={styles.actions}>
          {project.canApprove ? (
            <>
              <AppButton
                title="Approve project"
                loading={approveMutation.isPending}
                disabled={isOffline}
                onPress={handleApprove}
              />
              {!showReject ? (
                <AppButton
                  title="Reject project"
                  variant="secondary"
                  onPress={() => setShowReject(true)}
                  style={styles.actionSpaced}
                />
              ) : (
                <View style={styles.rejectBox}>
                  <TextInput
                    value={rejectReason}
                    onChangeText={setRejectReason}
                    placeholder="Rejection reason"
                    placeholderTextColor={colors.muted}
                    style={styles.rejectInput}
                    multiline
                  />
                  <AppButton
                    title="Submit rejection"
                    variant="danger"
                    loading={approveMutation.isPending}
                    disabled={isOffline}
                    onPress={handleReject}
                  />
                </View>
              )}
            </>
          ) : null}

          <AppButton
            title="Message manager"
            variant="secondary"
            onPress={() => void messageManager()}
            style={styles.actionSpaced}
          />

          <AppButton
            title="Add task"
            variant="secondary"
            disabled={!canCreateTask || isOffline}
            onPress={() => router.push(`/tasks/create?projectId=${project.id}` as never)}
            style={styles.actionSpaced}
          />

          <AppButton
            title="View reports"
            variant="ghost"
            onPress={() => router.push('/reports' as never)}
            style={styles.actionSpaced}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xxl,
  },
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: spacing.lg,
  },
  accent: {
    width: 4,
  },
  heroInner: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  heroBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'flex-end',
  },
  heroTitle: {
    color: colors.text,
    fontFamily: 'Inter_700Bold',
  },
  description: {
    color: colors.textSecondary,
  },
  deadlineRow: {
    backgroundColor: colors.overlay,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  deadlineLabel: {
    color: colors.textSecondary,
    marginBottom: 2,
  },
  deadlineValue: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  actions: {
    marginTop: spacing.xl,
  },
  actionSpaced: {
    marginTop: spacing.sm,
  },
  rejectBox: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  rejectInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
