import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addTaskComment,
  createTask,
  getAdminTaskOverview,
  getTaskById,
  getTaskComments,
  getTaskSubtasks,
  getTasks,
  updateTask,
} from '../api/tasks.api';
import { getUser } from '../api/users.api';
import { queryKeys } from '../constants/query-keys';
import type { TaskCreatePayload, TaskListParams, TaskUpdatePayload } from '../types/task';
import { mapTaskToViewModel } from '../utils/task-adapters';
import { useAuthStore } from '../auth/auth-store';

export function useTasks(params?: TaskListParams) {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: queryKeys.tasks(params as Record<string, string | undefined>),
    queryFn: () => getTasks(params),
    select: (records) => records.map((record) => mapTaskToViewModel(record, user)),
  });
}

export function useMyTasks() {
  const user = useAuthStore((s) => s.user);
  return useTasks(user?.id ? { assigned_to: user.id } : undefined);
}

export function useTeamTasksList() {
  return useTasks();
}

export function useTask(taskId: string | undefined) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const taskQuery = useQuery({
    queryKey: queryKeys.taskDetail(taskId ?? ''),
    queryFn: () => getTaskById(taskId!),
    enabled: Boolean(taskId),
  });

  const commentsQuery = useQuery({
    queryKey: queryKeys.taskComments(taskId ?? ''),
    queryFn: () => getTaskComments(taskId!),
    enabled: Boolean(taskId),
  });

  const subtasksQuery = useQuery({
    queryKey: queryKeys.taskSubtasks(taskId ?? ''),
    queryFn: () => getTaskSubtasks(taskId!),
    enabled: Boolean(taskId),
  });

  const creatorQuery = useQuery({
    queryKey: queryKeys.userDetail(taskQuery.data?.created_by ?? ''),
    queryFn: () => getUser(taskQuery.data!.created_by),
    enabled: Boolean(taskQuery.data?.created_by),
  });

  const subtasks = subtasksQuery.data ?? [];
  const viewModel =
    taskQuery.data != null
      ? mapTaskToViewModel(taskQuery.data, user, {
          commentsCount: commentsQuery.data?.length ?? 0,
          subtasksCount: subtasks.length,
          completedSubtasksCount: subtasks.filter((s) => s.status === 'completed' || s.status === 'reviewed').length,
          createdByName: creatorQuery.data?.full_name ?? null,
        })
      : null;

  const refetch = async () => {
    await Promise.all([
      taskQuery.refetch(),
      commentsQuery.refetch(),
      subtasksQuery.refetch(),
      creatorQuery.refetch(),
    ]);
  };

  return {
    task: viewModel,
    rawTask: taskQuery.data,
    comments: commentsQuery.data ?? [],
    subtasks,
    isLoading: taskQuery.isLoading,
    isError: taskQuery.isError,
    refetch,
  };
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: TaskCreatePayload) => createTask(payload),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.projectDetail(variables.project_id) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.projectTasks(variables.project_id) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, payload }: { taskId: string; payload: TaskUpdatePayload }) =>
      updateTask(taskId, payload),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.taskDetail(variables.taskId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      if (_data.project_id) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.projectDetail(_data.project_id) });
        await queryClient.invalidateQueries({ queryKey: queryKeys.projectTasks(_data.project_id) });
      }
    },
  });
}

export function useAddTaskComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, content }: { taskId: string; content: string }) => addTaskComment(taskId, content),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.taskComments(variables.taskId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.taskDetail(variables.taskId) });
    },
  });
}

export function useAdminTaskOverview(params?: Record<string, string | undefined>) {
  return useQuery({
    queryKey: queryKeys.adminTaskOverview(params),
    queryFn: () => getAdminTaskOverview(params),
    enabled: Boolean(params),
  });
}

export function useUpdateTaskStatus() {
  return useUpdateTask();
}
