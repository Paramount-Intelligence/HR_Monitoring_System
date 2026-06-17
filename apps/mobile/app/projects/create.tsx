import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BrandHeader } from '../../src/components/brand/BrandHeader';
import { Screen } from '../../src/components/ui/Screen';
import { ProjectForm } from '../../src/components/projects/ProjectForm';
import { useCreateProject } from '../../src/hooks/useProjects';
import { getErrorMessage } from '../../src/api/client';
import { useAuthStore } from '../../src/auth/auth-store';
import { useNetworkStore } from '../../src/network/network-store';
import type { ProjectPriority } from '../../src/types/project';
import { spacing } from '../../src/theme';

export default function CreateProjectScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isOffline = useNetworkStore((s) => s.isOffline);
  const createMutation = useCreateProject();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<ProjectPriority>('medium');
  const [dueDate, setDueDate] = useState('');

  const handleSubmit = () => {
    if (isOffline) {
      Alert.alert('Offline', 'Connect to the internet to create a project.');
      return;
    }

    createMutation.mutate(
      {
        title: title.trim(),
        description: description.trim(),
        priority,
        due_date: /^\d{4}-\d{2}-\d{2}$/.test(dueDate.trim()) ? dueDate.trim() : undefined,
        manager_id: user?.manager_id ?? undefined,
      },
      {
        onSuccess: (project) => {
          Alert.alert('Project created', 'Your project was submitted for review.');
          router.replace(`/projects/${project.id}` as never);
        },
        onError: (error) => {
          Alert.alert('Create failed', getErrorMessage(error, 'Unable to create project.'));
        },
      }
    );
  };

  return (
    <Screen headerSafeArea scroll={false} withTabBarInset={false}>
      <BrandHeader title="Create project" subtitle="Submit for manager approval" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ProjectForm
          title={title}
          description={description}
          priority={priority}
          dueDate={dueDate}
          onTitleChange={setTitle}
          onDescriptionChange={setDescription}
          onPriorityChange={setPriority}
          onDueDateChange={setDueDate}
          onSubmit={handleSubmit}
          submitLabel="Submit project"
          loading={createMutation.isPending}
          disabled={isOffline}
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
