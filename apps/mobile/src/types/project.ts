export type ProjectPriority = 'low' | 'medium' | 'high' | 'critical';

export type ProjectApprovalStatus = 'pending' | 'approved' | 'rejected' | 'escalated' | 'cancelled' | 'needs_clarification';

export type ProjectStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'active'
  | 'on_hold'
  | 'completed'
  | 'rejected'
  | 'archived';

export type ProjectHealth = 'on_track' | 'at_risk' | 'delayed' | 'completed' | 'planning' | 'unknown';

export interface ProjectApiRecord {
  id: string;
  title: string;
  description: string | null;
  owner_id: string;
  manager_id: string;
  priority: ProjectPriority;
  approval_status: ProjectApprovalStatus;
  project_status: ProjectStatus;
  due_date: string | null;
  approved_at: string | null;
  rejected_reason: string | null;
  progress_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreatePayload {
  title: string;
  description?: string | null;
  priority?: ProjectPriority;
  due_date?: string | null;
  manager_id?: string | null;
}

export interface ProjectDecisionPayload {
  decision: 'approved' | 'rejected';
  reason?: string | null;
}

export interface ProjectListParams {
  approval_status?: ProjectApprovalStatus;
  project_status?: ProjectStatus;
  owner_id?: string;
  manager_id?: string;
}

export interface ProjectTaskRecord {
  id: string;
  project_id: string;
  title: string;
  status: string;
  due_date: string | null;
  assigned_to_name?: string | null;
  priority: ProjectPriority;
}

export interface ProjectTaskSummary {
  total: number;
  completed: number;
  overdue: number;
  pending: number;
  inProgress: number;
}

export interface ProjectViewModel {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  approvalStatus: ProjectApprovalStatus;
  health: ProjectHealth;
  progress: number;
  priority: ProjectPriority;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  managerId: string;
  ownerName?: string | null;
  managerName?: string | null;
  teamMembersCount: number;
  taskSummary: ProjectTaskSummary;
  canEdit: boolean;
  canApprove: boolean;
  canCreateTask: boolean;
  rejectedReason: string | null;
}
