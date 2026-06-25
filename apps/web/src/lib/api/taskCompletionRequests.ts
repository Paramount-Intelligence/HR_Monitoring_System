import apiClient from './client';
import type { Task } from './tasks';

export type TaskCompletionRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'superseded';

export interface TaskCompletionRequestSummary {
  id: string;
  status: TaskCompletionRequestStatus;
  request_note?: string | null;
  manager_comment?: string | null;
  requested_at: string;
  reviewed_at?: string | null;
}

export interface TaskCompletionRequest {
  id: string;
  task_id: string;
  task_title: string;
  project_title?: string | null;
  task_status: Task['status'];
  requested_by_user_id: string;
  requested_by_name?: string | null;
  manager_id: string;
  manager_name?: string | null;
  status: TaskCompletionRequestStatus;
  request_note?: string | null;
  manager_comment?: string | null;
  requested_at: string;
  reviewed_at?: string | null;
  reviewed_by_user_id?: string | null;
  reviewed_by_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskCompletionRequestInput {
  request_note?: string;
}

export interface ReviewTaskCompletionRequestInput {
  manager_comment?: string;
}

export interface RejectTaskCompletionRequestInput {
  manager_comment: string;
}

export const taskCompletionRequestsApi = {
  create: async (taskId: string, body: CreateTaskCompletionRequestInput = {}) => {
    const response = await apiClient.post<TaskCompletionRequest>(
      `/tasks/${taskId}/completion-requests`,
      body
    );
    return response.data;
  },

  list: async (params?: { status?: TaskCompletionRequestStatus }) => {
    const response = await apiClient.get<TaskCompletionRequest[]>(
      '/tasks/completion-requests',
      { params }
    );
    return response.data;
  },

  get: async (requestId: string) => {
    const response = await apiClient.get<TaskCompletionRequest>(
      `/tasks/completion-requests/${requestId}`
    );
    return response.data;
  },

  approve: async (requestId: string, body: ReviewTaskCompletionRequestInput = {}) => {
    const response = await apiClient.post<TaskCompletionRequest>(
      `/tasks/completion-requests/${requestId}/approve`,
      body
    );
    return response.data;
  },

  reject: async (requestId: string, body: RejectTaskCompletionRequestInput) => {
    const response = await apiClient.post<TaskCompletionRequest>(
      `/tasks/completion-requests/${requestId}/reject`,
      body
    );
    return response.data;
  },
};
