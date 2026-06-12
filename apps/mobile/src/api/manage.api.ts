import { apiClient } from './client';
import type {
  AdminDashboardSummary,
  ManageSummary,
  ManagerDashboardSummary,
  TeamAttendanceParams,
} from '../types/manage';
import type { AttendanceSession } from '../types/attendance';
import { getPendingCorrections, getPendingLeaveRequests } from './approvals.api';
import {
  canAccessAdminDashboard,
  canAccessManagerDashboard,
  getManageHubTitle,
  normalizeRole,
} from '../utils/role';

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const { data } = await apiClient.get<AdminDashboardSummary>('/dashboard/admin');
  return data;
}

export async function getManagerDashboardSummary(): Promise<ManagerDashboardSummary> {
  const { data } = await apiClient.get<ManagerDashboardSummary>('/dashboard/manager');
  return data;
}

export async function getTeamAttendanceSessions(
  params?: TeamAttendanceParams
): Promise<AttendanceSession[]> {
  const { data } = await apiClient.get<AttendanceSession[]>('/attendance/team', { params });
  return data;
}

export { getTeamAttendanceSessions as getAttendanceOverview };

export async function getManageSummary(role: string | undefined | null): Promise<ManageSummary> {
  const normalized = normalizeRole(role);
  const title = getManageHubTitle(role);

  if (canAccessAdminDashboard(role)) {
    try {
      const admin = await getAdminDashboardSummary();
      return {
        role: normalized,
        title,
        activeEmployees: admin.active_users,
        presentToday: admin.checked_in_today,
        pendingApprovals: admin.pending_approvals_count,
        openAlerts: admin.open_alerts_count ?? admin.open_alerts,
      };
    } catch {
      // Fall through to lightweight summary
    }
  }

  if (canAccessManagerDashboard(role)) {
    try {
      const manager = await getManagerDashboardSummary();
      const present = manager.team_attendance_today.filter((member) => member.checked_in).length;
      return {
        role: normalized,
        title,
        teamMembers: manager.team_attendance_today.length,
        teamPresent: present,
        pendingApprovals: manager.pending_approvals_count,
      };
    } catch {
      // Fall through
    }
  }

  const [leaves, corrections] = await Promise.all([
    getPendingLeaveRequests().catch(() => []),
    getPendingCorrections().catch(() => []),
  ]);

  return {
    role: normalized,
    title,
    pendingApprovals: leaves.length + corrections.length,
  };
}
