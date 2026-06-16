import type {
  ProjectApiRecord,
  ProjectHealth,
  ProjectTaskRecord,
  ProjectTaskSummary,
  ProjectViewModel,
} from '../types/project';
import type { User } from '../types/user';
import { normalizeRole } from './role';

function isPastDue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

export function deriveProjectHealth(project: ProjectApiRecord): ProjectHealth {
  if (project.project_status === 'completed') return 'completed';
  if (project.project_status === 'pending_approval' || project.project_status === 'draft') {
    return 'planning';
  }
  if (project.project_status === 'on_hold' || project.approval_status === 'rejected') {
    return 'at_risk';
  }
  if (isPastDue(project.due_date)) {
    return 'delayed';
  }
  const progress = project.progress_percentage ?? 0;
  if (project.due_date) {
    const due = new Date(project.due_date);
    const daysLeft = (due.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysLeft <= 7 && progress < 50 && project.project_status === 'active') {
      return 'at_risk';
    }
  }
  if (project.project_status === 'active' || project.project_status === 'approved') {
    return 'on_track';
  }
  return 'unknown';
}

export function summarizeProjectTasks(tasks: ProjectTaskRecord[]): ProjectTaskSummary {
  const now = Date.now();
  let completed = 0;
  let overdue = 0;
  let inProgress = 0;
  let pending = 0;

  for (const task of tasks) {
    const status = task.status.toLowerCase();
    if (status === 'completed') {
      completed += 1;
      continue;
    }
    if (status === 'in_progress' || status === 'active' || status === 'approved') {
      inProgress += 1;
    } else {
      pending += 1;
    }
    if (task.due_date) {
      const due = new Date(task.due_date).getTime();
      if (!Number.isNaN(due) && due < now && status !== 'completed') {
        overdue += 1;
      }
    }
  }

  return {
    total: tasks.length,
    completed,
    overdue,
    pending,
    inProgress,
  };
}

export function buildProjectPermissions(
  project: ProjectApiRecord,
  user: User | null | undefined
): Pick<ProjectViewModel, 'canEdit' | 'canApprove' | 'canCreateTask'> {
  const role = normalizeRole(user?.role);
  const isManager = role === 'manager' && user?.id === project.manager_id;
  const isAdmin = role === 'admin';
  const isOwner = user?.id === project.owner_id;
  const approved =
    project.approval_status === 'approved' &&
    (project.project_status === 'active' || project.project_status === 'approved');

  return {
    canEdit: false,
    canApprove: (isManager || isAdmin) && project.approval_status === 'pending',
    canCreateTask: approved && (isManager || isAdmin || isOwner || role === 'team_lead'),
  };
}

export function canUserCreateProject(user: User | null | undefined): boolean {
  const role = normalizeRole(user?.role);
  return role === 'admin' || role === 'manager' || role === 'employee' || role === 'team_lead';
}

export function mapProjectToViewModel(
  project: ProjectApiRecord,
  options?: {
    user?: User | null;
    tasks?: ProjectTaskRecord[];
    ownerName?: string | null;
    managerName?: string | null;
  }
): ProjectViewModel {
  const taskSummary = summarizeProjectTasks(options?.tasks ?? []);
  const permissions = buildProjectPermissions(project, options?.user);

  return {
    id: project.id,
    name: project.title,
    description: project.description,
    status: project.project_status,
    approvalStatus: project.approval_status,
    health: deriveProjectHealth(project),
    progress: project.progress_percentage ?? 0,
    priority: project.priority,
    dueDate: project.due_date,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
    ownerId: project.owner_id,
    managerId: project.manager_id,
    ownerName: options?.ownerName ?? null,
    managerName: options?.managerName ?? null,
    teamMembersCount: 2,
    taskSummary,
    rejectedReason: project.rejected_reason,
    ...permissions,
  };
}
