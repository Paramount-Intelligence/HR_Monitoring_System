import { apiClient } from './client';
import type {
  TaskApiRecord,
  TaskCommentRecord,
  TaskCreatePayload,
  TaskListParams,
  TaskUpdatePayload,
} from '../types/task';

export async function getTasks(params?: TaskListParams): Promise<TaskApiRecord[]> {
  const { data } = await apiClient.get<TaskApiRecord[]>('/tasks', { params });
  return data;
}

export async function getTaskById(taskId: string): Promise<TaskApiRecord> {
  const { data } = await apiClient.get<TaskApiRecord>(`/tasks/${taskId}`);
  return data;
}

export async function createTask(payload: TaskCreatePayload): Promise<TaskApiRecord> {
  const { data } = await apiClient.post<TaskApiRecord>('/tasks', payload);
  return data;
}

export async function updateTask(taskId: string, payload: TaskUpdatePayload): Promise<TaskApiRecord> {
  const { data } = await apiClient.patch<TaskApiRecord>(`/tasks/${taskId}`, payload);
  return data;
}

export async function getTaskComments(taskId: string): Promise<TaskCommentRecord[]> {
  const { data } = await apiClient.get<TaskCommentRecord[]>(`/tasks/${taskId}/comments`);
  return data;
}

export async function addTaskComment(taskId: string, content: string): Promise<TaskCommentRecord> {
  const { data } = await apiClient.post<TaskCommentRecord>(`/tasks/${taskId}/comments`, { content });
  return data;
}

export async function getTaskSubtasks(taskId: string): Promise<TaskApiRecord[]> {
  const { data } = await apiClient.get<TaskApiRecord[]>(`/tasks/${taskId}/subtasks`);
  return data;
}

export interface AdminTaskOverview {
  summary: {
    total_tasks: number;
    active_tasks: number;
    in_progress: number;
    completed: number;
    overdue: number;
    currently_working: number;
  };
  total_count: number;
  tasks: TaskApiRecord[];
}

export async function getAdminTaskOverview(params?: Record<string, string | undefined>): Promise<AdminTaskOverview> {
  const { data } = await apiClient.get<AdminTaskOverview>('/tasks/admin/overview', { params });
  return data;
}
