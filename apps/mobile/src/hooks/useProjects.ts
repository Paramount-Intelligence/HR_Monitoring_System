import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveProject,
  createProject,
  getProjectById,
  getProjects,
  listProjectTasks,
  listVisibleTasks,
} from '../api/projects.api';
import { getUser } from '../api/users.api';
import { queryKeys } from '../constants/query-keys';
import type { ProjectCreatePayload, ProjectDecisionPayload, ProjectListParams } from '../types/project';
import { mapProjectToViewModel } from '../utils/project-adapters';
import { useAuthStore } from '../auth/auth-store';

function groupTasksByProject(tasks: Awaited<ReturnType<typeof listVisibleTasks>>) {
  const map = new Map<string, typeof tasks>();
  for (const task of tasks) {
    const bucket = map.get(task.project_id) ?? [];
    bucket.push(task);
    map.set(task.project_id, bucket);
  }
  return map;
}

export function useProjects(params?: ProjectListParams) {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: [...queryKeys.projects(params as Record<string, string | undefined>), 'with-tasks'],
    queryFn: async () => {
      const [records, tasks] = await Promise.all([getProjects(params), listVisibleTasks()]);
      const taskMap = groupTasksByProject(tasks);
      return records.map((record) =>
        mapProjectToViewModel(record, {
          user,
          tasks: taskMap.get(record.id) ?? [],
          ownerName: record.owner_id === user?.id ? user?.full_name : null,
          managerName: record.manager_id === user?.id ? user?.full_name : null,
        })
      );
    },
  });
}

export function useProject(projectId: string | undefined) {
  const user = useAuthStore((s) => s.user);

  const projectQuery = useQuery({
    queryKey: queryKeys.projectDetail(projectId ?? ''),
    queryFn: () => getProjectById(projectId!),
    enabled: Boolean(projectId),
  });

  const tasksQuery = useQuery({
    queryKey: queryKeys.projectTasks(projectId ?? ''),
    queryFn: () => listProjectTasks(projectId!),
    enabled: Boolean(projectId),
  });

  const ownerQuery = useQuery({
    queryKey: queryKeys.userDetail(projectQuery.data?.owner_id ?? ''),
    queryFn: () => getUser(projectQuery.data!.owner_id),
    enabled: Boolean(projectQuery.data?.owner_id),
  });

  const managerQuery = useQuery({
    queryKey: queryKeys.userDetail(projectQuery.data?.manager_id ?? ''),
    queryFn: () => getUser(projectQuery.data!.manager_id),
    enabled: Boolean(projectQuery.data?.manager_id),
  });

  const viewModel =
    projectQuery.data != null
      ? mapProjectToViewModel(projectQuery.data, {
          user,
          tasks: tasksQuery.data ?? [],
          ownerName: ownerQuery.data?.full_name ?? null,
          managerName: managerQuery.data?.full_name ?? null,
        })
      : null;

  return {
    project: viewModel,
    tasks: tasksQuery.data ?? [],
    isLoading: projectQuery.isLoading,
    isError: projectQuery.isError,
    error: projectQuery.error,
    refetch: async () => {
      await Promise.all([
        projectQuery.refetch(),
        tasksQuery.refetch(),
        ownerQuery.refetch(),
        managerQuery.refetch(),
      ]);
    },
  };
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ProjectCreatePayload) => createProject(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useApproveProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, payload }: { projectId: string; payload: ProjectDecisionPayload }) =>
      approveProject(projectId, payload),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.projectDetail(variables.projectId) });
    },
  });
}
