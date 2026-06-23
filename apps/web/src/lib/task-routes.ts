/**
 * Role-safe navigation helpers for tasks and active timer links.
 * Universal task detail lives at /tasks/[taskId] (dashboard layout, no role guard).
 * Backend RBAC enforces who may view each task.
 */

export function normalizeRole(role?: string | null): string {
  return (role ?? '').trim().toLowerCase();
}

export function isAdminRole(role?: string | null): boolean {
  const r = normalizeRole(role);
  return r === 'admin' || r === 'hr_operations';
}

export function isManagerRole(role?: string | null): boolean {
  const r = normalizeRole(role);
  return r === 'manager' || r === 'team_lead' || isAdminRole(r);
}

export function isEmployeeRole(role?: string | null): boolean {
  const r = normalizeRole(role);
  return r === 'employee' || r === 'intern' || r === 'junior_employee';
}

/** Time logs page for the current role (fallback when task id is missing). */
export function getTimeLogsHref(role?: string | null): string {
  const r = normalizeRole(role);
  if (isEmployeeRole(r)) return '/employee/time-logs';
  if (r === 'manager' || r === 'team_lead' || isAdminRole(r)) return '/manager/time-logs';
  return '/employee/time-logs';
}

/** Task list page for the current role. */
export function getTasksListHref(params: {
  role?: string | null;
  currentUserId?: string | null;
  assigneeId?: string | null;
}): string {
  const r = normalizeRole(params.role);
  if (isEmployeeRole(r)) return '/employee/tasks';
  if (isAdminRole(r)) return '/admin/tasks';
  if (r === 'manager' || r === 'team_lead') {
    if (params.currentUserId && params.assigneeId === params.currentUserId) {
      return '/manager/my-tasks';
    }
    return '/manager/tasks';
  }
  return '/employee/tasks';
}

/** Universal task detail route — backend enforces read access. */
export function getTaskDetailHref(params: {
  taskId?: string | null;
  role?: string | null;
}): string {
  const id = (params.taskId ?? '').trim();
  if (id) return `/tasks/${id}`;
  return getTimeLogsHref(params.role);
}

/** Header active-timer pill destination. */
export function getActiveTimerHref(params: {
  taskId?: string | null;
  role?: string | null;
}): string {
  return getTaskDetailHref(params);
}
