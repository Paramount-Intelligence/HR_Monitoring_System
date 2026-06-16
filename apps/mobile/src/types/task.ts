export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export type TaskStatus =
  | 'created'
  | 'approved'
  | 'in_progress'
  | 'blocked'
  | 'completed'
  | 'reviewed'
  | 'reopened';

export interface TaskApiRecord {
  id: string;
  project_id: string;
  project_title?: string | null;
  assigned_to: string;
  assigned_to_name?: string | null;
  created_by: string;
  title: string;
  description: string | null;
  parent_id?: string | null;
  complexity_level?: number | null;
  expected_duration_minutes?: number | null;
  actual_duration_minutes?: number | null;
  priority: TaskPriority;
  status: TaskStatus;
  blocked_reason?: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskCommentRecord {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_name?: string | null;
}

export interface TaskCreatePayload {
  project_id: string;
  assigned_to: string;
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  due_date?: string | null;
  parent_id?: string | null;
}

export interface TaskUpdatePayload {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  due_date?: string | null;
  status?: TaskStatus;
  blocked_reason?: string | null;
}

export interface TaskListParams {
  project_id?: string;
  assigned_to?: string;
  status?: TaskStatus;
}

export interface TaskViewModel {
  id: string;
  title: string;
  description: string | null;
  projectId: string;
  projectName: string;
  status: TaskStatus;
  priority: TaskPriority;
  progress: number;
  dueDate: string | null;
  completedAt: string | null;
  assignedToId: string;
  assigneeName: string;
  createdById: string;
  assignedByName: string;
  commentsCount: number;
  subtasksCount: number;
  completedSubtasksCount: number;
  isOverdue: boolean;
  canEdit: boolean;
  canUpdateStatus: boolean;
  canComment: boolean;
  canReassign: boolean;
  createdAt: string;
  updatedAt: string;
}
