import { apiClient } from './client';
import type {
  ProjectApiRecord,
  ProjectCreatePayload,
  ProjectDecisionPayload,
  ProjectListParams,
  ProjectTaskRecord,
} from '../types/project';

export async function getProjects(params?: ProjectListParams): Promise<ProjectApiRecord[]> {
  const { data } = await apiClient.get<ProjectApiRecord[]>('/projects', { params });
  return data;
}

export async function getProjectById(projectId: string): Promise<ProjectApiRecord> {
  const { data } = await apiClient.get<ProjectApiRecord>(`/projects/${projectId}`);
  return data;
}

export async function createProject(payload: ProjectCreatePayload): Promise<ProjectApiRecord> {
  const { data } = await apiClient.post<ProjectApiRecord>('/projects', payload);
  return data;
}

export async function approveProject(
  projectId: string,
  payload: ProjectDecisionPayload
): Promise<ProjectApiRecord> {
  const { data } = await apiClient.post<ProjectApiRecord>(`/projects/${projectId}/approve`, payload);
  return data;
}

export async function getTaskEligibleProjects(): Promise<ProjectApiRecord[]> {
  const { data } = await apiClient.get<ProjectApiRecord[]>('/projects/task-eligible');
  return data;
}

/** Read-only task list for project detail summaries (full Tasks module in Phase F). */
export async function listProjectTasks(projectId: string): Promise<ProjectTaskRecord[]> {
  const { data } = await apiClient.get<ProjectTaskRecord[]>('/tasks', {
    params: { project_id: projectId },
  });
  return data;
}

/** Read-only: all visible tasks grouped client-side for project list cards. */
export async function listVisibleTasks(): Promise<ProjectTaskRecord[]> {
  const { data } = await apiClient.get<ProjectTaskRecord[]>('/tasks');
  return data;
}
