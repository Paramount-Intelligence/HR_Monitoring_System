import { User, Shift } from '@/types';
import { Department } from '@/lib/api/departments';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function resolveDepartmentId(user: User, departments: Department[]): string {
  if (user.department_id) {
    return user.department_id;
  }

  const label = (user.department_name || user.department || '').trim();
  if (!label) {
    return 'none';
  }

  if (isUuid(label)) {
    const byId = departments.find((department) => department.id === label);
    return byId?.id ?? 'none';
  }

  const match = departments.find(
    (department) => department.name.toLowerCase() === label.toLowerCase()
  );
  return match?.id ?? 'none';
}

export function buildDepartmentOptions(user: User | null, departments: Department[]): Department[] {
  if (!user?.department_id) {
    return departments;
  }
  if (departments.some((department) => department.id === user.department_id)) {
    return departments;
  }
  return [
    ...departments,
    {
      id: user.department_id,
      name: user.department_name || 'Unnamed Department',
      is_active: true,
      created_at: '',
      updated_at: '',
    },
  ];
}

export function buildShiftOptions(user: User | null, shifts: Shift[]): Shift[] {
  if (!user?.shift_id) {
    return shifts;
  }
  if (shifts.some((shift) => shift.id === user.shift_id)) {
    return shifts;
  }
  return [
    ...shifts,
    {
      id: user.shift_id,
      name: user.shift_name || 'Unnamed Shift',
      start_time: '',
      end_time: '',
      timezone: '',
      grace_period_minutes: 0,
      working_days: '',
      is_active: true,
    },
  ];
}

export function buildManagerOptions(user: User | null, managers: User[]): User[] {
  if (!user?.manager_id) {
    return managers;
  }
  if (managers.some((manager) => manager.id === user.manager_id)) {
    return managers;
  }
  return [
    ...managers,
    {
      id: user.manager_id,
      full_name: user.manager_name || 'Unnamed Manager',
      email: '',
      role: 'manager',
      status: 'active',
      created_at: '',
      updated_at: '',
    } as User,
  ];
}

export interface DepartmentTabState {
  departmentId: string;
  shiftId: string;
  managerId: string;
  designation: string;
}

export function getDepartmentTabState(user: User, departments: Department[]): DepartmentTabState {
  return {
    departmentId: resolveDepartmentId(user, departments),
    shiftId: user.shift_id || 'none',
    managerId: user.manager_id || 'none',
    designation: user.designation || '',
  };
}

export function isDepartmentTabDirty(
  user: User,
  departments: Department[],
  state: DepartmentTabState
): boolean {
  const baseline = getDepartmentTabState(user, departments);
  return (
    state.departmentId !== baseline.departmentId ||
    state.shiftId !== baseline.shiftId ||
    state.managerId !== baseline.managerId ||
    state.designation !== baseline.designation
  );
}
