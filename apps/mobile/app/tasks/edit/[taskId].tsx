import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { BrandHeader } from '../../../src/components/brand/BrandHeader';
import { Screen } from '../../../src/components/ui/Screen';
import { ErrorState } from '../../../src/components/ui/ErrorState';
import { LoadingSkeletonList } from '../../../src/components/ui/LoadingSkeleton';
import { TaskForm } from '../../../src/components/tasks/TaskForm';
import { useTask, useUpdateTask } from '../../../src/hooks/useTasks';
import { getTaskEligibleProjects } from '../../../src/api/projects.api';
import { searchUsers } from '../../../src/api/users.api';
import { getErrorMessage } from '../../../src/api/client';
import { useNetworkStore } from '../../../src/network/network-store';
import { queryKeys } from '../../../src/constants/query-keys';
import type { TaskPriority } from '../../../src/types/task';
import type { User } from '../../../src/types/user';
import { spacing } from '../../../src/theme';

export default function EditTaskScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ taskId: string }>();
  const taskId = params.taskId;
  const isOffline = useNetworkStore((s) => s.isOffline);

  const { task, isLoading, isError, refetch } = useTask(taskId);
  const updateMutation = useUpdateTask();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [projectId, setProjectId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [assigneeQuery, setAssigneeQuery] = useState('');
  const [assigneeResults, setAssigneeResults] = useState<User[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState<User | null>(null);
  const [initialized, setInitialized] = useState(false);

  const projectsQuery = useQuery({
    queryKey: queryKeys.projectTaskEligible,
    queryFn: getTaskEligibleProjects,
  });

  const projects = projectsQuery.data ?? [];

  useEffect(() => {
    if (task && !initialized) {
      setTitle(task.title);
      setDescription(task.description ?? '');
      setPriority(task.priority);
      setDueDate(task.dueDate ?? '');
      setProjectId(task.projectId);
      setAssigneeId(task.assignedToId);
      setAssigneeQuery(task.assigneeName);
      setSelectedAssignee({
        id: task.assignedToId,
        full_name: task.assigneeName,
        email: '',
        role: '',
        status: 'active',
      });
      setInitialized(true);
    }
  }, [task, initialized]);

  useEffect(() => {
    const trimmed = assigneeQuery.trim();
    if (trimmed.length < 2) {
      setAssigneeResults(selectedAssignee ? [selectedAssignee] : []);
      return;
    }
    const timer = setTimeout(() => {
      void searchUsers(trimmed)
        .then(setAssigneeResults)
        .catch(() => setAssigneeResults([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [assigneeQuery, selectedAssignee]);

  const handleAssigneeSelect = (user: User) => {
    setAssigneeId(user.id);
    setSelectedAssignee(user);
    setAssigneeQuery(user.full_name);
    setAssigneeResults([user]);
  };

  const handleSubmit = () => {
    if (!task || isOffline) return;

    if (!task.canEdit) {
      Alert.alert('Edit unavailable', 'You do not have permission to edit this task.');
      return;
    }

    updateMutation.mutate(
      {
        taskId: task.id,
        payload: {
          title: title.trim(),
          description: description.trim() || null,
          priority,
          due_date: /^\d{4}-\d{2}-\d{2}$/.test(dueDate.trim()) ? dueDate.trim() : null,
        },
      },
      {
        onSuccess: () => {
          Alert.alert('Task updated', 'Changes saved successfully.');
          router.back();
        },
        onError: (error) => {
          Alert.alert('Update failed', getErrorMessage(error, 'Unable to update task.'));
        },
      }
    );
  };

  if (isLoading && !task) {
    return (
      <Screen headerSafeArea withTabBarInset={false}>
        <BrandHeader title="Edit task" onBack={() => router.back()} />
        <LoadingSkeletonList count={3} />
      </Screen>
    );
  }

  if (isError || !task) {
    return (
      <Screen headerSafeArea withTabBarInset={false}>
        <BrandHeader title="Edit task" onBack={() => router.back()} />
        <ErrorState
          title="Task unavailable"
          message="Unable to load task for editing."
          onRetry={() => void refetch()}
        />
      </Screen>
    );
  }

  if (!task.canEdit) {
    return (
      <Screen headerSafeArea withTabBarInset={false}>
        <BrandHeader title="Edit task" onBack={() => router.back()} />
        <ErrorState
          title="Edit unavailable"
          message="Only managers and admins can edit task details. Use status actions on the task detail screen."
        />
      </Screen>
    );
  }

  return (
    <Screen headerSafeArea scroll={false} withTabBarInset={false}>
      <BrandHeader title="Edit task" subtitle={task.title} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TaskForm
          title={title}
          description={description}
          priority={priority}
          dueDate={dueDate}
          projectId={projectId}
          assigneeId={assigneeId}
          projects={projects}
          assigneeQuery={assigneeQuery}
          assigneeResults={
            selectedAssignee && !assigneeResults.some((u) => u.id === selectedAssignee.id)
              ? [selectedAssignee, ...assigneeResults]
              : assigneeResults
          }
          onTitleChange={setTitle}
          onDescriptionChange={setDescription}
          onPriorityChange={setPriority}
          onDueDateChange={setDueDate}
          onProjectChange={setProjectId}
          onAssigneeQueryChange={setAssigneeQuery}
          onAssigneeSelect={handleAssigneeSelect}
          onSubmit={handleSubmit}
          submitLabel="Save changes"
          loading={updateMutation.isPending}
          disabled={isOffline}
          editMode
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xxl,
  },
});
