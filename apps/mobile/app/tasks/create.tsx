import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { BrandHeader } from '../../src/components/brand/BrandHeader';
import { Screen } from '../../src/components/ui/Screen';
import { TaskForm } from '../../src/components/tasks/TaskForm';
import { useCreateTask } from '../../src/hooks/useTasks';
import { getTaskEligibleProjects } from '../../src/api/projects.api';
import { searchUsers } from '../../src/api/users.api';
import { getErrorMessage } from '../../src/api/client';
import { useNetworkStore } from '../../src/network/network-store';
import { queryKeys } from '../../src/constants/query-keys';
import type { TaskPriority } from '../../src/types/task';
import type { User } from '../../src/types/user';
import { spacing } from '../../src/theme';

export default function CreateTaskScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ projectId?: string }>();
  const isOffline = useNetworkStore((s) => s.isOffline);
  const createMutation = useCreateTask();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [projectId, setProjectId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [assigneeQuery, setAssigneeQuery] = useState('');
  const [assigneeResults, setAssigneeResults] = useState<User[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState<User | null>(null);

  const projectsQuery = useQuery({
    queryKey: queryKeys.projectTaskEligible,
    queryFn: getTaskEligibleProjects,
  });

  const projects = projectsQuery.data ?? [];

  useEffect(() => {
    if (params.projectId && projects.some((p) => p.id === params.projectId)) {
      setProjectId(params.projectId);
    } else if (!projectId && projects.length > 0) {
      setProjectId(projects[0].id);
    }
  }, [params.projectId, projects, projectId]);

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
    if (isOffline) {
      Alert.alert('Offline', 'Connect to the internet to create a task.');
      return;
    }

    createMutation.mutate(
      {
        project_id: projectId,
        assigned_to: assigneeId,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        due_date: /^\d{4}-\d{2}-\d{2}$/.test(dueDate.trim()) ? dueDate.trim() : undefined,
      },
      {
        onSuccess: (task) => {
          Alert.alert('Task created', 'The task was assigned successfully.');
          router.replace(`/tasks/${task.id}` as never);
        },
        onError: (error) => {
          Alert.alert('Create failed', getErrorMessage(error, 'Unable to create task.'));
        },
      }
    );
  };

  return (
    <Screen headerSafeArea scroll={false} withTabBarInset={false}>
      <BrandHeader title="Create task" subtitle="Assign work to your team" onBack={() => router.back()} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 56 : 0}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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
          submitLabel="Create task"
          loading={createMutation.isPending}
          disabled={isOffline || projectsQuery.isLoading}
        />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xxl,
  },
});
