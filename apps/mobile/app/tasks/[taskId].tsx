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
  TaskAssigneeRow,
  TaskChecklist,
  TaskCommentComposer,
  TaskCommentsTimeline,
  TaskPriorityBadge,
  TaskProgressSummary,
  TaskStatusBadge,
} from '../../src/components/tasks';
import { useAddTaskComment, useTask, useUpdateTask } from '../../src/hooks/useTasks';
import { getOrCreateDirectConversation } from '../../src/api/conversations.api';
import { getErrorMessage } from '../../src/api/client';
import { formatDate } from '../../src/utils/format';
import { getAvailableTaskActions, getTaskAccentColor } from '../../src/utils/task-adapters';
import { useNetworkStore } from '../../src/network/network-store';
import type { TaskStatus } from '../../src/types/task';
import { colors, radius, spacing, typography } from '../../src/theme';

export default function TaskDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ taskId: string }>();
  const taskId = params.taskId;
  const isOffline = useNetworkStore((s) => s.isOffline);

  const { task, comments, subtasks, isLoading, isError, refetch } = useTask(taskId);
  const updateMutation = useUpdateTask();
  const commentMutation = useAddTaskComment();

  const [blockedReason, setBlockedReason] = useState('');
  const [showBlockInput, setShowBlockInput] = useState(false);

  const handleStatusUpdate = (status: TaskStatus, needsBlockedReason?: boolean) => {
    if (!task || isOffline) return;

    if (needsBlockedReason) {
      setShowBlockInput(true);
      return;
    }

    updateMutation.mutate(
      { taskId: task.id, payload: { status } },
      {
        onSuccess: () => Alert.alert('Updated', 'Task status updated.'),
        onError: (error) =>
          Alert.alert('Update failed', getErrorMessage(error, 'Unable to update task status.')),
      }
    );
  };

  const submitBlocked = () => {
    if (!task || isOffline) return;
    const reason = blockedReason.trim();
    if (reason.length < 3) {
      Alert.alert('Reason required', 'Please provide a blocked reason.');
      return;
    }
    updateMutation.mutate(
      { taskId: task.id, payload: { status: 'blocked', blocked_reason: reason } },
      {
        onSuccess: () => {
          setShowBlockInput(false);
          setBlockedReason('');
          Alert.alert('Updated', 'Task marked as blocked.');
        },
        onError: (error) =>
          Alert.alert('Update failed', getErrorMessage(error, 'Unable to update task.')),
      }
    );
  };

  const handleComment = (content: string) => {
    if (!task || isOffline) return;
    commentMutation.mutate(
      { taskId: task.id, content },
      {
        onError: (error) =>
          Alert.alert('Comment failed', getErrorMessage(error, 'Unable to post comment.')),
      }
    );
  };

  const messageAssignee = async () => {
    if (!task?.assignedToId) return;
    try {
      const conversation = await getOrCreateDirectConversation(task.assignedToId);
      router.push(`/chat/${conversation.id}` as never);
    } catch (error) {
      Alert.alert('Messages', getErrorMessage(error, 'Unable to open conversation.'));
    }
  };

  if (isLoading && !task) {
    return (
      <Screen withTabBarInset={false}>
        <BrandHeader title="Task" onBack={() => router.back()} />
        <LoadingSkeletonList count={4} />
      </Screen>
    );
  }

  if (isError || !task) {
    return (
      <Screen withTabBarInset={false}>
        <BrandHeader title="Task" onBack={() => router.back()} />
        <ErrorState
          title="Task unavailable"
          message="Unable to load this task or access is restricted."
          onRetry={() => void refetch()}
        />
      </Screen>
    );
  }

  const accent = getTaskAccentColor(task, task.isOverdue);
  const actions = getAvailableTaskActions(task.status, task.canUpdateStatus);

  return (
    <Screen scroll={false} withTabBarInset={false}>
      <OfflineBanner />
      <BrandHeader title="Task detail" onBack={() => router.back()} />
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
              <TaskStatusBadge status={task.status} />
              <TaskPriorityBadge priority={task.priority} />
            </View>
            <Text style={[typography.headlineLg, styles.heroTitle]}>{task.title}</Text>
            <Text style={[typography.bodyMd, styles.projectName]}>{task.projectName}</Text>
            {task.dueDate ? (
              <View style={styles.deadlineRow}>
                <Text style={[typography.labelSm, styles.deadlineLabel]}>DUE DATE</Text>
                <Text style={[typography.bodyMd, styles.deadlineValue]}>
                  {formatDate(task.dueDate)}
                  {task.isOverdue ? ' · Overdue' : ''}
                </Text>
              </View>
            ) : null}
            <TaskProgressSummary progress={task.progress} status={task.status} />
          </View>
        </View>

        <TaskAssigneeRow
          assigneeName={task.assigneeName}
          assignedByName={task.assignedByName}
        />

        {task.description ? (
          <IntelligenceCard title="Description" accentColor={colors.primary}>
            <Text style={[typography.bodyMd, styles.description]}>{task.description}</Text>
          </IntelligenceCard>
        ) : null}

        {subtasks.length > 0 ? (
          <>
            <Text style={[typography.headlineMd, styles.sectionTitle]}>Checklist</Text>
            <TaskChecklist subtasks={subtasks} />
          </>
        ) : null}

        <Text style={[typography.headlineMd, styles.sectionTitle]}>Comments</Text>
        <TaskCommentsTimeline comments={comments} />
        {task.canComment ? (
          <TaskCommentComposer
            onSubmit={handleComment}
            loading={commentMutation.isPending}
            disabled={isOffline}
          />
        ) : null}

        {actions.length > 0 ? (
          <>
            <Text style={[typography.headlineMd, styles.sectionTitle]}>Actions</Text>
            <View style={styles.actions}>
              {actions.map((action) => (
                <AppButton
                  key={action.id}
                  title={action.label}
                  variant={action.status === 'completed' ? 'primary' : 'secondary'}
                  loading={updateMutation.isPending}
                  disabled={isOffline}
                  onPress={() => handleStatusUpdate(action.status, action.needsBlockedReason)}
                  style={styles.actionBtn}
                />
              ))}
            </View>
          </>
        ) : null}

        {showBlockInput ? (
          <View style={styles.blockBox}>
            <TextInput
              value={blockedReason}
              onChangeText={setBlockedReason}
              placeholder="Why is this task blocked?"
              placeholderTextColor={colors.muted}
              style={styles.blockInput}
              multiline
            />
            <AppButton
              title="Submit blocked status"
              variant="danger"
              loading={updateMutation.isPending}
              disabled={isOffline}
              onPress={submitBlocked}
            />
          </View>
        ) : null}

        <View style={styles.footerActions}>
          {task.canEdit ? (
            <AppButton
              title="Edit task"
              variant="secondary"
              onPress={() => router.push(`/tasks/edit/${task.id}` as never)}
              disabled={isOffline}
            />
          ) : null}
          <AppButton
            title="Message assignee"
            variant="secondary"
            onPress={() => void messageAssignee()}
            style={styles.actionSpaced}
          />
          <AppButton
            title="View project"
            variant="ghost"
            onPress={() => router.push(`/projects/${task.projectId}` as never)}
            style={styles.actionSpaced}
          />
          <AppButton
            title="Related alerts"
            variant="ghost"
            onPress={() => router.push('/alerts')}
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
    gap: spacing.md,
  },
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
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
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  heroTitle: {
    color: colors.text,
    fontFamily: 'Inter_700Bold',
  },
  projectName: {
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
  description: {
    color: colors.text,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
    marginTop: spacing.sm,
  },
  actions: {
    gap: spacing.sm,
  },
  actionBtn: {
    marginBottom: 0,
  },
  blockBox: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  blockInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  footerActions: {
    marginTop: spacing.lg,
  },
  actionSpaced: {
    marginTop: spacing.sm,
  },
});
