import { apiClient } from './client';
import type { User } from '../types/user';
import type {
  SecurityActionResponse,
  UserAdminSummary,
  UserAuditLogEntry,
  UserPermissionsDetail,
} from '../types/admin-user';

export interface DepartmentOption {
  id: string;
  name: string;
  is_active?: boolean;
}

export interface ShiftOption {
  id: string;
  name: string;
  start_time?: string;
  end_time?: string;
  is_active?: boolean;
}

export async function updateUserAdminProfile(
  userId: string,
  payload: { full_name?: string; email?: string; phone?: string | null; designation?: string }
): Promise<User> {
  const { data } = await apiClient.patch<User>(`/users/${userId}/admin-profile`, payload);
  return data;
}

export async function updateUserRole(userId: string, role: string): Promise<User> {
  const { data } = await apiClient.patch<User>(`/users/${userId}/role`, { role });
  return data;
}

export async function updateUserStatus(userId: string, status: string): Promise<User> {
  const { data } = await apiClient.patch<User>(`/users/${userId}/status`, { status });
  return data;
}

export async function updateUserDepartmentDetails(
  userId: string,
  payload: {
    department_id?: string | null;
    shift_id?: string | null;
    manager_id?: string | null;
    designation?: string | null;
  }
): Promise<User> {
  const { data } = await apiClient.patch<User>(`/users/${userId}/department-details`, payload);
  return data;
}

export async function getUserPermissionsDetail(userId: string): Promise<UserPermissionsDetail> {
  const { data } = await apiClient.get<UserPermissionsDetail>(`/users/${userId}/permissions`);
  return data;
}

export async function updateUserPermissions(
  userId: string,
  payload: { extra_grants: string[]; extra_denies: string[] }
): Promise<UserPermissionsDetail> {
  const { data } = await apiClient.patch<UserPermissionsDetail>(
    `/users/${userId}/permissions`,
    payload
  );
  return data;
}

export async function sendUserPasswordReset(userId: string): Promise<SecurityActionResponse> {
  const { data } = await apiClient.post<SecurityActionResponse>(
    `/users/${userId}/send-password-reset`
  );
  return data;
}

export async function forceUserPasswordReset(userId: string): Promise<SecurityActionResponse> {
  const { data } = await apiClient.post<SecurityActionResponse>(
    `/users/${userId}/force-password-reset`
  );
  return data;
}

export async function resendUserInvitation(userId: string): Promise<SecurityActionResponse> {
  const { data } = await apiClient.post<SecurityActionResponse>(
    `/users/${userId}/resend-invitation`
  );
  return data;
}

export async function getUserAdminSummary(userId: string): Promise<UserAdminSummary> {
  const { data } = await apiClient.get<UserAdminSummary>(`/users/${userId}/admin-summary`);
  return data;
}

export async function getUserAuditLogs(userId: string, limit = 50): Promise<UserAuditLogEntry[]> {
  const { data } = await apiClient.get<UserAuditLogEntry[]>(`/users/${userId}/audit-logs`, {
    params: { limit },
  });
  return data;
}

export async function getDepartments(): Promise<DepartmentOption[]> {
  const { data } = await apiClient.get<DepartmentOption[]>('/departments');
  return data;
}

export async function getShifts(onlyActive = true): Promise<ShiftOption[]> {
  const { data } = await apiClient.get<ShiftOption[]>('/shifts', {
    params: { only_active: onlyActive },
  });
  return data;
}

export async function listPermissionsCatalog(): Promise<
  { key: string; label: string; category: string; description: string }[]
> {
  const { data } = await apiClient.get<
    { key: string; label: string; category: string; description: string }[]
  >('/permissions');
  return data;
}
