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
