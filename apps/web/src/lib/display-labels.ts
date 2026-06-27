import { User, Shift } from '@/types';
import { Department } from '@/lib/api/departments';

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuidLike(value: unknown): boolean {
  return typeof value === 'string' && UUID_RE.test(value.trim());
}

export function safeDisplayLabel(
  label: string | null | undefined,
  fallback: string,
  context?: string
): string {
  const trimmed = (label ?? '').trim();
  if (!trimmed || isUuidLike(trimmed)) {
    if (process.env.NODE_ENV === 'development' && trimmed && isUuidLike(trimmed)) {
      console.warn(
        `[UUID_EXPOSURE_GUARD] Prevented UUID label${context ? ` in ${context}` : ''}`
      );
    }
    return fallback;
  }
  return trimmed;
}

export interface LabeledOption {
  value: string;
  label: string;
}

export function getDepartmentLabel(
  department: {
    id?: string;
    name?: string | null;
    department_name?: string | null;
  },
  fallback = 'Unnamed Department'
): string {
  return safeDisplayLabel(
    department.name ?? department.department_name,
    fallback,
    'Department'
  );
}

export function getShiftLabel(
  shift: {
    name?: string | null;
    shift_name?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    shift_timing?: string | null;
  },
  fallback = 'Unnamed Shift'
): string {
  const name = safeDisplayLabel(shift.name ?? shift.shift_name, fallback, 'Shift');
  if (shift.shift_timing) {
    return safeDisplayLabel(shift.shift_timing, `${name}`, 'Shift timing');
  }
  if (shift.start_time && shift.end_time) {
    return `${name} (${shift.start_time}–${shift.end_time})`;
  }
  return name;
}

export function getUserLabel(
  user: {
    full_name?: string | null;
    name?: string | null;
    email?: string | null;
  },
  fallback = 'Unnamed User'
): string {
  const fromName = safeDisplayLabel(user.full_name ?? user.name, '', 'User');
  if (fromName) return fromName;
  return safeDisplayLabel(user.email, fallback, 'User email');
}

export function getManagerLabel(
  user: {
    full_name?: string | null;
    name?: string | null;
    email?: string | null;
    designation?: string | null;
    role?: string | null;
  },
  fallback = 'Unnamed User'
): string {
  const base = getUserLabel(user, fallback);
  const designation = user.designation
    ? safeDisplayLabel(user.designation, '', 'Manager designation')
    : '';
  if (designation) {
    return `${base} — ${designation}`;
  }
  if (user.role) {
    const roleLabel = safeDisplayLabel(user.role, '', 'Manager role');
    if (roleLabel && roleLabel !== base) {
      return `${base} — ${roleLabel}`;
    }
  }
  return base;
}

export function getUserDepartmentDisplay(user: {
  department_id?: string | null;
  department_name?: string | null;
  department?: string | null;
}): string {
  const name = user.department_name ?? user.department;
  if (!user.department_id && !name) {
    return 'No department';
  }
  return safeDisplayLabel(name, 'No department', 'User department badge');
}

export function getUserManagerDisplay(
  user: {
    manager_id?: string | null;
    manager_name?: string | null;
  },
  users: User[] = []
): string {
  if (!user.manager_id) return '—';
  const fromApi = safeDisplayLabel(user.manager_name, '', 'Manager badge');
  if (fromApi) return fromApi;
  const match = users.find((candidate) => candidate.id === user.manager_id);
  if (match) return getManagerLabel(match);
  return 'Unnamed User';
}

export function makeDepartmentOptions(
  departments: Department[],
  selected?: {
    id?: string | null;
    name?: string | null;
    legacyName?: string | null;
  }
): LabeledOption[] {
  const options: LabeledOption[] = departments.map((department) => ({
    value: department.id,
    label: getDepartmentLabel(department),
  }));

  const selectedId = selected?.id && selected.id !== 'none' ? selected.id : null;
  if (!selectedId || options.some((option) => option.value === selectedId)) {
    return options;
  }

  options.push({
    value: selectedId,
    label: getDepartmentLabel(
      { name: selected.name ?? selected.legacyName },
      'Unnamed Department'
    ),
  });
  return options;
}

export function makeShiftOptions(
  shifts: Shift[],
  selected?: {
    id?: string | null;
    name?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    shift_timing?: string | null;
  }
): LabeledOption[] {
  const options: LabeledOption[] = shifts.map((shift) => ({
    value: shift.id,
    label: getShiftLabel(shift),
  }));

  const selectedId = selected?.id && selected.id !== 'none' ? selected.id : null;
  if (!selectedId || options.some((option) => option.value === selectedId)) {
    return options;
  }

  options.push({
    value: selectedId,
    label: getShiftLabel(
      {
        name: selected.name,
        start_time: selected.start_time,
        end_time: selected.end_time,
        shift_timing: selected.shift_timing,
      },
      'Unnamed Shift'
    ),
  });
  return options;
}

export function makeManagerOptions(
  managers: User[],
  selected?: {
    id?: string | null;
    name?: string | null;
    email?: string | null;
    designation?: string | null;
    role?: string | null;
  },
  allUsers: User[] = []
): LabeledOption[] {
  const options: LabeledOption[] = managers.map((manager) => ({
    value: manager.id,
    label: getManagerLabel(manager),
  }));

  const selectedId = selected?.id && selected.id !== 'none' ? selected.id : null;
  if (!selectedId || options.some((option) => option.value === selectedId)) {
    return options;
  }

  const match = allUsers.find((candidate) => candidate.id === selectedId);
  options.push({
    value: selectedId,
    label: match
      ? getManagerLabel(match)
      : getManagerLabel(
          {
            full_name: selected.name,
            email: selected.email,
            designation: selected.designation,
            role: selected.role,
          },
          'Unnamed User'
        ),
  });
  return options;
}

export function resolveOptionLabel(
  options: LabeledOption[],
  value: string,
  noneLabel: string
): string {
  if (!value || value === 'none') {
    return noneLabel;
  }
  const match = options.find((option) => option.value === value);
  if (match) {
    return match.label;
  }
  if (isUuidLike(value)) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[UUID_EXPOSURE_GUARD] Prevented UUID label in select trigger');
    }
    return noneLabel;
  }
  return safeDisplayLabel(value, noneLabel, 'Select trigger');
}

export function getProjectLabel(
  project: { title?: string | null; name?: string | null },
  fallback = 'Untitled Project'
): string {
  return safeDisplayLabel(project.title ?? project.name, fallback, 'Project');
}

/** Alias for dropdown/display helpers — prefers human-readable project name. */
export function getProjectDisplayName(
  project: { title?: string | null; name?: string | null; project_name?: string | null },
  fallback = 'Untitled Project'
): string {
  return getProjectLabel(
    { title: project.title ?? project.project_name, name: project.name },
    fallback
  );
}

/** Alias for dropdown/display helpers — prefers human-readable task title. */
export function getTaskDisplayName(
  task: { title?: string | null; task_title?: string | null; name?: string | null },
  fallback = 'Untitled Task'
): string {
  return safeDisplayLabel(task.title ?? task.task_title ?? task.name, fallback, 'Task');
}

export function getAssigneeLabel(
  task: {
    assigned_to_name?: string | null;
    assignee_name?: string | null;
    assigned_to?: string | null;
  },
  usersMap?: Map<string, { full_name?: string | null; name?: string | null; email?: string | null }>,
  currentUserId?: string | null,
  fallback = 'Unassigned'
): string {
  const fromApi = safeDisplayLabel(
    task.assigned_to_name ?? task.assignee_name,
    '',
    'Task assignee'
  );
  if (fromApi) {
    if (currentUserId && task.assigned_to === currentUserId) {
      return 'You';
    }
    return fromApi;
  }
  if (task.assigned_to && usersMap) {
    const user = usersMap.get(task.assigned_to);
    if (user) {
      const name = getUserLabel(user);
      if (currentUserId && task.assigned_to === currentUserId) {
        return 'You';
      }
      return name;
    }
  }
  if (task.assigned_to && isUuidLike(task.assigned_to)) {
    return fallback;
  }
  return fallback;
}

export function makeProjectOptions(
  projects: { id: string; title?: string | null }[],
  selected?: { id?: string | null; title?: string | null }
): LabeledOption[] {
  const options: LabeledOption[] = projects.map((project) => ({
    value: project.id,
    label: getProjectLabel(project),
  }));

  const selectedId = selected?.id && selected.id !== 'none' ? selected.id : null;
  if (!selectedId || options.some((option) => option.value === selectedId)) {
    return options;
  }

  options.push({
    value: selectedId,
    label: getProjectLabel({ title: selected.title }, 'Unknown project'),
  });
  return options;
}

export function makeAssigneeOptions(
  users: {
    id: string;
    full_name?: string | null;
    name?: string | null;
    email?: string | null;
    role?: string | null;
    designation?: string | null;
  }[],
  currentUserId?: string | null,
  selected?: { id?: string | null; name?: string | null; role?: string | null }
): LabeledOption[] {
  const options: LabeledOption[] = users.map((user) => {
    const base = getUserLabel(user);
    const roleSuffix = user.role
      ? ` (${safeDisplayLabel(user.role, '', 'Assignee role')})`
      : '';
    const label =
      currentUserId && user.id === currentUserId
        ? `${base} (You)`
        : `${base}${roleSuffix}`;
    return { value: user.id, label };
  });

  const selectedId = selected?.id && selected.id !== 'none' ? selected.id : null;
  if (!selectedId || options.some((option) => option.value === selectedId)) {
    return options;
  }

  options.push({
    value: selectedId,
    label: getUserLabel({ full_name: selected.name }, 'Unknown user'),
  });
  return options;
}

export function buildUsersById<T extends { id: string }>(users: T[]): Map<string, T> {
  return new Map(users.map((user) => [user.id, user]));
}

export function getEntityLabelById<T extends { id: string }>(
  id: string | null | undefined,
  map: Map<string, T>,
  getLabel: (entity: T) => string,
  fallback: string
): string {
  if (!id) return fallback;
  const entity = map.get(id);
  if (entity) return getLabel(entity);
  if (isUuidLike(id)) return fallback;
  return safeDisplayLabel(id, fallback, 'Entity label');
}

export function getTaskProjectLabel(
  task: { project_title?: string | null; project_id?: string | null },
  projectsMap?: Map<string, { title?: string | null }>,
  fallback = 'Unknown project'
): string {
  const fromApi = safeDisplayLabel(task.project_title, '', 'Task project');
  if (fromApi) return fromApi;
  if (task.project_id && projectsMap) {
    const project = projectsMap.get(task.project_id);
    if (project) return getProjectLabel(project, fallback);
  }
  return fallback;
}

export function getTaskTimerLabel(
  task: {
    id?: string;
    title?: string | null;
    task_title?: string | null;
    taskTitle?: string | null;
    project_title?: string | null;
    project_name?: string | null;
    projectName?: string | null;
    project_id?: string | null;
    task?: { title?: string | null; name?: string | null; project?: { name?: string | null; title?: string | null } };
    project?: { name?: string | null; title?: string | null };
  },
  projectsMap?: Map<string, { title?: string | null }>,
  fallback = 'Deleted or unavailable task'
): string {
  const rawTitle =
    task.task_title ||
    task.taskTitle ||
    task.title ||
    task.task?.title ||
    task.task?.name ||
    '';
  const taskTitle = safeDisplayLabel(rawTitle, fallback, 'Timer task');
  const rawProject =
    task.project_title ||
    task.projectName ||
    task.project_name ||
    task.task?.project?.name ||
    task.task?.project?.title ||
    task.project?.name ||
    task.project?.title ||
    '';
  const projectTitle =
    safeDisplayLabel(rawProject, '', 'Timer project') ||
    (task.project_id && projectsMap ? getTaskProjectLabel(task, projectsMap, '') : '');
  if (projectTitle && projectTitle !== 'Unknown project') {
    return `${taskTitle} — ${projectTitle}`;
  }
  return taskTitle;
}

export function getActiveTimerTaskTitle(
  timer: {
    title?: string | null;
    task_title?: string | null;
    taskTitle?: string | null;
    task?: { title?: string | null; name?: string | null };
  },
  fallback = 'Deleted or unavailable task',
): string {
  const rawTitle =
    timer.task_title ||
    timer.taskTitle ||
    timer.title ||
    timer.task?.title ||
    timer.task?.name ||
    '';
  return safeDisplayLabel(rawTitle, fallback, 'Timer task');
}

export function getActiveTimerProjectName(
  timer: {
    project_title?: string | null;
    project_name?: string | null;
    projectName?: string | null;
    project_id?: string | null;
    task?: { project?: { name?: string | null; title?: string | null } };
    project?: { name?: string | null; title?: string | null };
  },
  projectsMap?: Map<string, { title?: string | null }>,
): string | null {
  const rawProject =
    timer.project_title ||
    timer.projectName ||
    timer.project_name ||
    timer.task?.project?.name ||
    timer.task?.project?.title ||
    timer.project?.name ||
    timer.project?.title ||
    '';
  const projectTitle =
    safeDisplayLabel(rawProject, '', 'Timer project') ||
    (timer.project_id && projectsMap ? getTaskProjectLabel(timer, projectsMap, '') : '');
  return projectTitle && projectTitle !== 'Unknown project' ? projectTitle : null;
}

export function makeTaskTimerOptions(
  tasks: {
    id: string;
    title?: string | null;
    project_title?: string | null;
    project_id?: string | null;
    status?: string | null;
  }[],
  projectsMap?: Map<string, { title?: string | null }>,
  selected?: {
    id?: string | null;
    title?: string | null;
    project_title?: string | null;
    project_id?: string | null;
  }
): LabeledOption[] {
  const eligible = tasks.filter((task) => task.status !== 'completed' && task.status !== 'archived');
  const options: LabeledOption[] = eligible.map((task) => ({
    value: task.id,
    label: getTaskTimerLabel(task, projectsMap),
  }));

  const selectedId = selected?.id && selected.id !== 'none' ? selected.id : null;
  if (!selectedId || options.some((option) => option.value === selectedId)) {
    return options;
  }

  options.push({
    value: selectedId,
    label: getTaskTimerLabel(
      {
        title: selected.title,
        project_title: selected.project_title,
        project_id: selected.project_id,
      },
      projectsMap
    ),
  });
  return options;
}
