import { User, Shift } from '@/types';
import { Department } from '@/lib/api/departments';
import {
  isUuidLike,
  LabeledOption,
  makeDepartmentOptions,
  makeManagerOptions,
  makeShiftOptions,
} from '@/lib/display-labels';

export { isUuidLike as isUuid };

export function resolveDepartmentId(user: User, departments: Department[]): string {
  if (user.department_id) {
    return user.department_id;
  }

  const label = (user.department_name || user.department || '').trim();
  if (!label) {
    return 'none';
  }

  if (isUuidLike(label)) {
    const byId = departments.find((department) => department.id === label);
    return byId?.id ?? 'none';
  }

  const match = departments.find(
    (department) => department.name.toLowerCase() === label.toLowerCase()
  );
  return match?.id ?? 'none';
}

export function buildDepartmentSelectOptions(
  departments: Department[],
  user: User | null,
  selectedDepartmentId: string
): LabeledOption[] {
  return makeDepartmentOptions(departments, {
    id: selectedDepartmentId !== 'none' ? selectedDepartmentId : user?.department_id,
    name: user?.department_name,
    legacyName: user?.department,
  });
}

export function buildShiftSelectOptions(
  shifts: Shift[],
  user: User | null,
  selectedShiftId: string
): LabeledOption[] {
  return makeShiftOptions(shifts, {
    id: selectedShiftId !== 'none' ? selectedShiftId : user?.shift_id,
    name: user?.shift_name,
    shift_timing: user?.shift_timing ?? undefined,
  });
}

export function buildManagerSelectOptions(
  managers: User[],
  allUsers: User[],
  user: User | null,
  selectedManagerId: string
): LabeledOption[] {
  const selectedId = selectedManagerId !== 'none' ? selectedManagerId : user?.manager_id;
  const selectedUser = selectedId ? allUsers.find((candidate) => candidate.id === selectedId) : null;

  return makeManagerOptions(
    managers.filter((manager) => manager.id !== user?.id),
    {
      id: selectedId,
      name: selectedUser?.full_name ?? user?.manager_name,
      email: selectedUser?.email,
      designation: selectedUser?.designation,
      role: selectedUser?.role,
    },
    allUsers
  );
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
